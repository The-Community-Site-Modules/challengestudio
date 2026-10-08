/**
 * Open a file a participant uploaded with their submission.
 *
 * Submission files live in the private bucket and were stored by key — with
 * nothing anywhere that ever turned a key back into something viewable, so a
 * creator could see that work had been uploaded and never open it.
 *
 * `?n=` picks the file by position in the submission, never by key: a key
 * from the browser would let anyone with this permission sign any object in
 * the bucket. The key read from the payload is also required to sit under the
 * participant's own prefix, because the payload itself was written by the
 * participant and could name somebody else's upload.
 */

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { signedDownloadUrl, storageConfigured } from '@/lib/storage'
import { submissionFiles, submissionIsPrivate } from '@/lib/submissions/payload'

interface Params {
  params: Promise<{ workspaceSlug: string; challengeSlug: string; submissionId: string }>
}

const notFound = () => new NextResponse('Not found', { status: 404 })

export async function GET(request: Request, { params }: Params) {
  const { workspaceSlug, challengeSlug, submissionId } = await params
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) return notFound()

  if (!(await hasPermission(user.id, workspace.id, 'submission.view_all'))) {
    return new NextResponse('Not allowed', { status: 403 })
  }

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true },
  })
  if (!challenge) return notFound()

  const submission = await db.submission.findUnique({
    where:  { id: submissionId },
    select: {
      data: true, isPrivate: true, participantId: true,
      step: { select: { challengeId: true } },
    },
  })
  // The id is from the URL; it has to be this challenge's.
  if (!submission || submission.step.challengeId !== challenge.id) return notFound()

  if (submission.isPrivate || submissionIsPrivate(submission.data)) {
    if (!(await hasPermission(user.id, workspace.id, 'submission.view_private'))) {
      return new NextResponse('Not allowed', { status: 403 })
    }
  }

  const n = Number(new URL(request.url).searchParams.get('n') ?? '0')
  const file = Number.isInteger(n) && n >= 0 ? submissionFiles(submission.data)[n] : undefined
  if (!file) return notFound()

  // Uploads are stored as <workspace>/<challenge>/<participant>/<unique>.<ext>.
  const ownPrefix = `${workspace.id}/${challenge.id}/${submission.participantId}/`
  if (!file.key.startsWith(ownPrefix) || file.key.includes('..')) return notFound()

  if (!storageConfigured()) {
    return new NextResponse('File storage is not configured on this deployment.', { status: 503 })
  }

  try {
    const url = await signedDownloadUrl(file.key)
    return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[submission file] could not sign', { submissionId, error })
    return notFound()
  }
}
