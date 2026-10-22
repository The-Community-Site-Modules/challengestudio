'use server'

/**
 * Uploading a profile photo.
 *
 * Kept out of `actions.ts` for the same reason the workspace upload is kept out
 * of its sibling: this one touches object storage on a service-role key, and
 * the narrower the file that imports `lib/storage`, the easier it is to be
 * certain none of it reaches a browser.
 *
 * The photo goes in the public bucket on purpose — an avatar is shown to the
 * team and to challenge participants, so a signed URL that expires would mean a
 * broken picture five minutes later.
 *
 * Keyed by the person's own id, so one account cannot write over another's
 * photo, and so a stray object in the bucket can be traced back to whose it is.
 */

import { requireUser } from '@/lib/auth/session'
import {
  uploadPublicFile, storageKey, storageConfigured,
  IMAGE_TYPES, MAX_IMAGE_BYTES,
} from '@/lib/storage'

export interface AvatarUploadResult {
  url?: string
  error?: string
}

function human(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.round(bytes / 1024)} KB`
}

export async function uploadAvatarAction(formData: FormData): Promise<AvatarUploadResult> {
  if (!storageConfigured()) {
    return { error: 'Image uploads are not configured on this deployment.' }
  }

  // No permission check beyond being signed in: this writes only under the
  // caller's own id, and everyone is allowed a photo of themselves.
  const user = await requireUser()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file was received.' }
  }

  // Checked here rather than trusting the input's `accept`, which is a hint to
  // the file picker and nothing more.
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: 'That file is not a PNG, JPEG, WebP or GIF.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `That image is ${human(file.size)}. The limit is ${human(MAX_IMAGE_BYTES)}.` }
  }

  try {
    const key = storageKey(['avatars', user.id], file.name)
    const stored = await uploadPublicFile(key, await file.arrayBuffer(), file.type)
    return { url: stored.url }
  } catch (error) {
    // The reason goes to the server log; the person gets something they can act
    // on. A raw storage error leaks bucket names and key shapes.
    console.error('[avatar upload] failed:', error)
    return { error: 'The upload did not complete. Try again.' }
  }
}
