// Route: /ws/[workspaceSlug]/submissions — work waiting across every challenge.
//
// The sidebar has linked here since the sidebar existed. Reviewing happens per
// challenge, so this is a way in rather than a second review screen: it says
// where the unreviewed work is and sends you to it.

import Link from 'next/link'
import { Inbox, ArrowRight } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export const metadata = { title: 'Submissions — Challenge Studio' }

export default async function WorkspaceSubmissionsPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  if (!(await hasPermission(user.id, workspace.id, 'submission.view_all'))) {
    redirect(`/ws/${workspaceSlug}`)
  }

  const challenges = await db.challenge.findMany({
    where:  { workspaceId: workspace.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true, title: true, status: true,
      steps: {
        select: {
          _count: { select: { submissions: true } },
        },
      },
    },
  })

  // One grouped query rather than one per challenge.
  const pending = await db.submission.groupBy({
    by: ['stepId'],
    where:  { reviewedAt: null, step: { challenge: { workspaceId: workspace.id } } },
    _count: { stepId: true },
  })
  const stepIds = pending.map(p => p.stepId)
  const steps = stepIds.length > 0
    ? await db.challengeStep.findMany({
        where:  { id: { in: stepIds } },
        select: { id: true, challengeId: true },
      })
    : []
  const stepToChallenge = new Map(steps.map(s => [s.id, s.challengeId]))

  const awaitingByChallenge = new Map<string, number>()
  for (const row of pending) {
    const challengeId = stepToChallenge.get(row.stepId)
    if (!challengeId) continue
    awaitingByChallenge.set(challengeId, (awaitingByChallenge.get(challengeId) ?? 0) + row._count.stepId)
  }

  const rows = challenges
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      status: String(c.status).toLowerCase(),
      total: c.steps.reduce((n, s) => n + s._count.submissions, 0),
      awaiting: awaitingByChallenge.get(c.id) ?? 0,
    }))
    .filter(c => c.total > 0)

  const totalAwaiting = rows.reduce((n, c) => n + c.awaiting, 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        {...(totalAwaiting > 0 ? { submissionCount: totalAwaiting } : {})}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Submissions"
            description="Where the work waiting on you is. Reviewing happens inside each challenge."
          />

          {rows.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Inbox className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                Nothing submitted yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                Work appears here once participants complete steps that ask for
                something to be handed in.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-5 text-[13px] text-slate-500">
                {totalAwaiting === 0
                  ? 'Everything has been reviewed.'
                  : `${totalAwaiting} awaiting review`}
              </p>

              <ul className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {rows.map((c) => (
                  <li key={c.slug} className="border-b border-slate-100 last:border-b-0">
                    <Link
                      href={`/ws/${workspaceSlug}/challenges/${c.slug}/submissions`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {c.title}
                        </span>
                        <span className="mt-0.5 block text-[12px] uppercase tracking-wide text-slate-500">
                          {c.status}
                        </span>
                      </span>

                      {c.awaiting > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700">
                          {c.awaiting} to review
                        </span>
                      )}
                      <span className="w-24 shrink-0 text-right text-[13px] tabular-nums text-slate-500">
                        {c.total} total
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
