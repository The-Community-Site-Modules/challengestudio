// Route: .../challenges/[challengeSlug]/rewards
//
// What this challenge awards, and who has earned it. Read-only on purpose:
// badges are defined in code and points come from a fixed table, so there is
// nothing here a creator can change yet. Showing a form that saved nowhere
// would be worse than showing the rules plainly.

import { notFound } from 'next/navigation'
import { Trophy, Star } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { BADGES, POINT_VALUES } from '@/lib/gamification'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Rewards — Challenge Studio' }

/** How each action reads to someone who has not seen the code. */
const ACTION_LABEL: Record<string, string> = {
  day_completed:       'Completing a step',
  response_submitted:  'Submitting a response',
  challenge_completed: 'Finishing the challenge',
  feed_posted:         'Posting in the feed',
  comment_given:       'Commenting on a post',
}

/** Actions capped per day, so the page does not overstate what they earn. */
const CAP_NOTE: Record<string, string> = {
  feed_posted:   'up to 3 a day',
  comment_given: 'up to 5 a day',
}

export default async function RewardsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true },
  })
  if (!challenge) notFound()

  const [awards, participants] = await Promise.all([
    db.badgeAward.groupBy({
      by: ['badgeKey'],
      where: { challengeId: challenge.id },
      _count: { badgeKey: true },
    }),
    db.participant.count({ where: { challengeId: challenge.id } }),
  ])
  const earnedBy = new Map(awards.map(a => [a.badgeKey, a._count.badgeKey]))

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Rewards"
            description="What participants earn, and how many have earned it."
          />

          <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-600">
            These rules are the same for every challenge for now. Configuring
            them per challenge is not built yet — this page shows what is
            actually being awarded rather than a form that saves nowhere.
          </p>

          {/* Points */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Star className="h-4 w-4 text-slate-500" />
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Points</h2>
            </header>
            <ul className="divide-y divide-slate-100">
              {Object.entries(POINT_VALUES).map(([action, points]) => (
                <li key={action} className="flex items-center gap-4 px-5 py-3">
                  <span className="min-w-0 flex-1 text-sm text-slate-800">
                    {ACTION_LABEL[action] ?? action}
                    {CAP_NOTE[action] && (
                      <span className="ml-2 text-[12px] text-slate-500">{CAP_NOTE[action]}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                    {points.toLocaleString()} XP
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
              A step with its own XP value overrides the default above.
            </p>
          </section>

          {/* Badges */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Trophy className="h-4 w-4 text-slate-500" />
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Badges</h2>
              <span className="ml-auto text-[12px] text-slate-500">
                {participants} participant{participants === 1 ? '' : 's'}
              </span>
            </header>
            <ul className="divide-y divide-slate-100">
              {BADGES.map((badge) => {
                const count = earnedBy.get(badge.key) ?? 0
                return (
                  <li key={badge.key} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg ring-1 ring-amber-100">
                      {badge.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">{badge.name}</span>
                      <span className="block text-[13px] text-slate-500">{badge.description}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-medium tabular-nums text-slate-900">
                        {count}
                      </span>
                      <span className="block text-[12px] text-slate-500">earned</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
