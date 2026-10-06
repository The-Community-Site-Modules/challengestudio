'use server'

/**
 * A participant uploading a file as part of their day's work.
 *
 * Separate from the creator's upload action in `(workspace)` for one reason
 * that matters: this writes to the **private** bucket. A submission is
 * somebody's work, shown to them and the creator and nobody else, so it never
 * gets a public address — the day page asks for a short-lived signed URL when
 * it needs to show it back.
 *
 * Returning the storage key rather than a URL is part of that. A URL in the
 * submission row would be a URL in an export, a log, or a screenshot, and
 * would outlive the reasons anyone had to see it.
 */

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import {
  uploadPrivateFile, storageKey, storageConfigured,
  FILE_TYPES, MAX_FILE_BYTES,
} from '@/lib/storage'

export interface SubmissionUploadResult {
  key?: string
  filename?: string
  error?: string
}

/**
 * Store one file against this participant's enrolment.
 *
 * Enrolment is checked first: without it this is an upload endpoint for anyone
 * with an account, writing into a bucket this project pays for.
 */
export async function uploadSubmissionFileAction(
  challengeSlug: string,
  formData: FormData
): Promise<SubmissionUploadResult> {
  if (!storageConfigured()) {
    return { error: 'File uploads are not configured on this deployment.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to upload a file.' }

  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: { id: true, workspaceId: true },
  })
  if (!challenge) return { error: 'That challenge does not exist.' }

  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true },
  })
  // PENDING means not approved yet — they cannot open the day, so they cannot
  // upload against it either.
  if (!participant || participant.status === 'PENDING') {
    return { error: 'You need to be taking part to upload here.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file was received.' }
  }

  // Checked here, not trusted from the input's `accept`, which only filters
  // the file picker.
  if (!(FILE_TYPES as readonly string[]).includes(file.type)) {
    return { error: 'That file type is not accepted.' }
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = Math.round(MAX_FILE_BYTES / (1024 * 1024))
    return { error: `That file is too large. The limit is ${mb} MB.` }
  }

  try {
    // Namespaced by participant so one person's work cannot collide with
    // another's, and so a path is readable when something needs tracing.
    const key = storageKey([challenge.workspaceId, challenge.id, participant.id], file.name)
    await uploadPrivateFile(key, await file.arrayBuffer(), file.type)
    return { key, filename: file.name }
  } catch (error) {
    console.error('[submission upload] failed:', error)
    return { error: 'The upload did not complete. Try again.' }
  }
}
