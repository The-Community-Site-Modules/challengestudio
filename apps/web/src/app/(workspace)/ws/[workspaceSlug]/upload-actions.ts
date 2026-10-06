'use server'

/**
 * Uploading an image from the builder and the challenge wizard.
 *
 * Kept apart from `challenges/actions.ts` because this one touches object
 * storage rather than the database, and because everything here runs on a
 * service-role key — the narrower the file that imports `lib/storage`, the
 * easier it is to be sure none of it reaches a browser.
 *
 * The upload is permission-checked against the workspace before a byte is
 * written. Without that, the action is an open file host for anyone with a
 * session: the bucket is public, so an unchecked upload endpoint is somebody
 * else's image hosting, paid for by this project.
 */

import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import {
  uploadPublicFile, storageKey, storageConfigured,
  IMAGE_TYPES, FILE_TYPES, MAX_IMAGE_BYTES, MAX_FILE_BYTES,
} from '@/lib/storage'

export interface UploadResult {
  url?: string
  key?: string
  error?: string
}

function human(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} KB`
}

/**
 * Store a file and return its public address.
 *
 * `kind` decides what is allowed through: `image` for anything rendered in a
 * page, `file` for worksheets and downloads.
 */
export async function uploadWorkspaceFileAction(
  workspaceSlug: string,
  formData: FormData,
  kind: 'image' | 'file' = 'image'
): Promise<UploadResult> {
  if (!storageConfigured()) {
    return { error: 'File storage is not configured on this deployment.' }
  }

  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) return { error: 'That workspace does not exist.' }

  await requirePermission(user.id, workspace.id, 'challenge.edit')

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file was received.' }
  }

  const allowed: readonly string[] = kind === 'image' ? IMAGE_TYPES : FILE_TYPES
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES

  // Checked here rather than trusting the input's `accept`, which is a hint to
  // the file picker and nothing more.
  if (!allowed.includes(file.type)) {
    return {
      error:
        kind === 'image'
          ? 'That file is not a PNG, JPEG, WebP or GIF.'
          : 'That file type is not accepted.',
    }
  }
  if (file.size > limit) {
    return { error: `That file is ${human(file.size)}. The limit is ${human(limit)}.` }
  }

  try {
    const key = storageKey([workspace.id, kind], file.name)
    const stored = await uploadPublicFile(key, await file.arrayBuffer(), file.type)
    return { url: stored.url, key: stored.key }
  } catch (error) {
    // The reason is for the server log; the person gets something they can act
    // on. A raw storage error leaks bucket names and key shapes.
    console.error('[upload] failed:', error)
    return { error: 'The upload did not complete. Try again.' }
  }
}
