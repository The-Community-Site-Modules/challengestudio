// Route: .../challenges/[challengeSlug]/settings
//
// Server shell so the sidebar — which reads the session — stays out of the
// client bundle. next/headers cannot cross that boundary, and importing it
// from a client page fails only at build time, never in dev.
//
// Until 2026-09-30 this page loaded nothing: the client rendered a hard-coded
// slug of "5-day-launch" for every challenge and its Save button flashed
// "Saved!" without writing anything. Worse than a missing page, because it
// looked like the settings had been changed.

import { redirect } from 'next/navigation'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import ChallengeSettingsClient from './_components/settings-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in the challenge's own zone. */
function toLocalInput(at: Date | null, timeZone: string): string {
  if (!at) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    timeZone,
  }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export default async function ChallengeSettingsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenge = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      id: true, slug: true, title: true, status: true, mode: true,
      timezone: true, startsAt: true, endsAt: true,
      registrationOpensAt: true, registrationClosesAt: true,
      isPublic: true, maxParticipants: true, requiresApproval: true,
      // Counted so the delete dialog can say what it is about to destroy in
      // numbers rather than in the abstract.
      _count: { select: { participants: true, steps: true, feedPosts: true } },
    },
  })

  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  const submissionCount = await db.submission.count({
    where: { step: { challengeId: challenge.id } },
  })

  const tz = challenge.timezone ?? 'UTC'

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
      />
      <ChallengeSettingsClient
        workspaceSlug={workspaceSlug}
        challenge={{
          id: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
          status: challenge.status as string,
          mode: challenge.mode as string,
          timezone: tz,
          startsAt: toLocalInput(challenge.startsAt, tz),
          endsAt: toLocalInput(challenge.endsAt, tz),
          registrationOpensAt: toLocalInput(challenge.registrationOpensAt, tz),
          registrationClosesAt: toLocalInput(challenge.registrationClosesAt, tz),
          isPublic: challenge.isPublic,
          maxParticipants: challenge.maxParticipants,
          requiresApproval: challenge.requiresApproval,
          participantCount: challenge._count.participants,
          stepCount: challenge._count.steps,
          postCount: challenge._count.feedPosts,
          submissionCount,
        }}
      />
    </div>
  )
}
