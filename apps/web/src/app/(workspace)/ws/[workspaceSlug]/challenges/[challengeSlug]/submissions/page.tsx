// Route: .../challenges/[challengeSlug]/submissions — review participant work.
//
// This page is the first thing in the product that reads submissions, which
// makes it the first place PRD §27 bites: "private submissions cannot be
// accessed by unrelated participants or workspaces". The privacy flag was
// being collected all along and stored inside the JSON payload where nothing
// could filter on it; it is a column now, and this page filters on it.
//
// Two capabilities, not one. Seeing submissions is submission.view_all;
// seeing the private ones is submission.view_private, which the PRD reserves
// for "the participant and authorized facilitators".

import { notFound, redirect } from 'next/navigation'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { ReviewClient, type SubmissionRow } from './_components/review-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Submissions — Challenge Studio' }

/**
 * Pull something readable out of a submission payload.
 *
 * Blocks store their own shapes, so this looks for the ones that carry writing
 * and leaves the rest alone rather than dumping raw JSON at a reviewer.
 */
function readableAnswer(data: unknown): string {
  if (typeof data !== 'object' || data === null) return ''
  const d = data as Record<string, unknown>

  if (typeof d.text === 'string') return d.text
  if (typeof d.answer === 'string') return d.answer

  // Whatever else is a plain string, in the order the block stored it.
  return Object.entries(d)
    .filter(([key, v]) => typeof v === 'string' && key !== 'isPrivate')
    .map(([, v]) => v as string)
    .join('\n\n')
}

export default async function SubmissionsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  const [canView, canViewPrivate, canReview] = await Promise.all([
    hasPermission(user.id, workspace.id, 'submission.view_all'),
    hasPermission(user.id, workspace.id, 'submission.view_private'),
    hasPermission(user.id, workspace.id, 'submission.review'),
  ])
  if (!canView) {
    redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)
  }

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true },
  })
  if (!challenge) notFound()

  const rows = await db.submission.findMany({
    where:   { step: { challengeId: challenge.id } },
    orderBy: [{ reviewedAt: 'asc' }, { submittedAt: 'desc' }],
    take: 200,
    select: {
      id: true, data: true, isPrivate: true, submittedAt: true,
      feedback: true, reviewedAt: true, reviewedById: true,
      step: { select: { title: true } },
      participant: {
        select: { profile: { select: { fullName: true, email: true, avatarUrl: true } } },
      },
    },
  })

  // One query for reviewer names rather than one per row.
  const reviewerIds = [...new Set(rows.map(r => r.reviewedById).filter((id): id is string => !!id))]
  const reviewers = reviewerIds.length > 0
    ? await db.profile.findMany({
        where:  { id: { in: reviewerIds } },
        select: { id: true, fullName: true, email: true },
      })
    : []
  const reviewerName = new Map(reviewers.map(r => [r.id, r.fullName?.trim() || r.email]))

  const submissions: SubmissionRow[] = rows.map((r) => ({
    id: r.id,
    stepTitle: r.step.title,
    submittedAt: r.submittedAt.toISOString(),
    authorName: r.participant.profile.fullName?.trim() || r.participant.profile.email,
    authorAvatar: r.participant.profile.avatarUrl,
    isPrivate: r.isPrivate,
    // Withheld rather than rendered and hidden in CSS — a private answer that
    // reaches the browser has already left the server.
    answer: r.isPrivate && !canViewPrivate ? null : readableAnswer(r.data),
    feedback: r.feedback ?? '',
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewerName: r.reviewedById ? reviewerName.get(r.reviewedById) ?? null : null,
  }))

  const awaiting = submissions.filter(s => !s.reviewedAt).length

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
        {...(awaiting > 0 ? { submissionCount: awaiting } : {})}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Submissions"
            description={`Work handed in for ${challenge.title}. Leaving feedback emails the participant.`}
          />
          <ReviewClient
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            submissions={submissions}
            canReview={canReview}
          />
        </div>
      </main>
    </div>
  )
}
