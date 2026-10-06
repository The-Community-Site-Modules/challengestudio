/**
 * File storage, on Supabase Storage.
 *
 * ── Why Supabase and not the R2 in OD-02 ────────────────────────────────────
 *
 * OD-02 named Cloudflare R2, and that decision was made before Supabase was in
 * the stack. It is now: the database, auth and this all sit in one project, on
 * one set of credentials, with one dashboard to check when something is
 * missing. R2 would be a second service to hold keys for, bill for and explain.
 * If upload volume ever makes egress the deciding cost, the two functions below
 * are the only things that would need rewriting.
 *
 * ── Two buckets, and the line between them ──────────────────────────────────
 *
 * `PUBLIC_BUCKET` holds things that are meant to be seen by anyone who can see
 * the page they sit on: cover images, day images, images inside content blocks.
 * Those appear on registration pages that are open to the world, so a signed
 * URL would buy nothing and break the moment it expired.
 *
 * `PRIVATE_BUCKET` holds participant submissions. Those are somebody's work,
 * shown only to them and the creator, so they are served through short-lived
 * signed URLs and never have a public address.
 *
 * Putting a submission in the public bucket would make it readable by anyone
 * who guessed the path. The two helpers are deliberately separate so that
 * mistake has to be typed on purpose.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const PUBLIC_BUCKET = 'public-content'
export const PRIVATE_BUCKET = 'submissions'

/** 5 MB. Big enough for a cover image, small enough not to be a surprise. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** 25 MB for worksheets and PDFs. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

/**
 * SVG is not in the list on purpose. An SVG is a document that can carry
 * script, and these are uploaded by one person and rendered to others.
 */
export const FILE_TYPES = [
  ...IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
] as const

let cached: SupabaseClient | null = null

/**
 * The service-role client. Server only — this key bypasses row-level security,
 * so nothing that reaches a browser may import this module.
 */
function admin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Storage is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must both be set.'
    )
  }

  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

/** Buckets this process has already checked for, so it asks once per boot. */
const ensured = new Set<string>()

/**
 * Create the bucket if it is not there yet.
 *
 * Done on demand rather than in a migration because a bucket is not a schema
 * object — there is no `prisma migrate` step that would make one, and a setup
 * document nobody reads is how a feature ships broken on a fresh project.
 */
async function ensureBucket(bucket: string, isPublic: boolean): Promise<void> {
  if (ensured.has(bucket)) return

  const { error } = await admin().storage.createBucket(bucket, {
    public: isPublic,
    fileSizeLimit: isPublic ? MAX_IMAGE_BYTES : MAX_FILE_BYTES,
  })

  // Already there is the expected case after the first upload ever.
  if (error && !/exist/i.test(error.message)) throw error
  ensured.add(bucket)
}

/** A stored name that cannot collide and cannot carry a path of its own. */
export function storageKey(parts: string[], filename: string): string {
  const ext = /\.([a-z0-9]{1,8})$/i.exec(filename)?.[1]?.toLowerCase() ?? 'bin'
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const safe = parts
    .map((p) => p.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/')
  return `${safe}/${unique}.${ext}`
}

export interface StoredFile {
  key: string
  url: string
}

/**
 * Upload something meant to be seen publicly, and hand back its address.
 */
export async function uploadPublicFile(
  key: string,
  body: ArrayBuffer | Uint8Array | Blob,
  contentType: string
): Promise<StoredFile> {
  await ensureBucket(PUBLIC_BUCKET, true)

  const { error } = await admin()
    .storage.from(PUBLIC_BUCKET)
    .upload(key, body, { contentType, upsert: false })

  if (error) throw error

  const { data } = admin().storage.from(PUBLIC_BUCKET).getPublicUrl(key)
  return { key, url: data.publicUrl }
}

/** Upload a participant's work. No public address is ever produced for it. */
export async function uploadPrivateFile(
  key: string,
  body: ArrayBuffer | Uint8Array | Blob,
  contentType: string
): Promise<{ key: string }> {
  await ensureBucket(PRIVATE_BUCKET, false)

  const { error } = await admin()
    .storage.from(PRIVATE_BUCKET)
    .upload(key, body, { contentType, upsert: false })

  if (error) throw error
  return { key }
}

/**
 * A temporary address for a private file.
 *
 * Short by default: long enough to click, short enough that a link pasted into
 * a group chat has stopped working by the time anyone else opens it.
 */
export async function signedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await admin()
    .storage.from(PRIVATE_BUCKET)
    .createSignedUrl(key, expiresInSeconds)

  if (error) throw error
  return data.signedUrl
}

/** Remove a stored file. Used when a block is deleted or an image replaced. */
export async function deletePublicFile(key: string): Promise<void> {
  const { error } = await admin().storage.from(PUBLIC_BUCKET).remove([key])
  if (error) throw error
}

/** Whether storage can work at all, for a caller that wants to degrade. */
export function storageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)
}
