import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, Zap, Users, UserRound, Inbox } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { UrlToast } from '@/components/shared/url-toast'
import { GlobalSidebar } from './_components/global-sidebar'
import { createWorkspaceAction } from '../actions'
import { CreateWorkspace } from './_components/create-workspace'
import { WorkspaceBrowser, type WorkspaceCardData } from './_components/workspace-browser'
import { TimeSeriesChart } from '@/components/shared/time-series-chart'
import { getWorkspaceSummaries, getPickerTotals, getAgencyOverview } from './_lib/queries'

export const metadata = { title: 'Dashboard — Challenge Studio' }
export const dynamic = 'force-dynamic'

/**
 * How long ago, in the words a person would use.
 *
 * Takes a Date rather than the ISO string the card list uses, because these
 * rows come straight from the query and never cross into a client component.
 */
function relativeDay(then: Date) {
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Two digits below ten, the way a counter reads — 07 rather than 7. */
function pad(n: number) {
  return n < 10 ? `0${n}` : n.toLocaleString()
}

interface PageProps {
  searchParams: Promise<{ all?: string; new?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await requireUser()
  const { all, new: openCreate } = await searchParams
  const summaries = await getWorkspaceSummaries(user.id)

  // One workspace is not a choice — go straight to it.
  //
  // Unless the person asked to be here. The only way to create a workspace is
  // the button on this page, so an unconditional bounce meant anyone with
  // exactly one workspace could never make a second: "All workspaces" led
  // here and here led straight back. The links that mean "show me the list"
  // and "make a new one" carry a parameter, and that parameter wins.
  if (summaries.length === 1 && all === undefined && openCreate === undefined) {
    redirect(`/ws/${summaries[0]!.slug}`)
  }

  const [totals, agency] = await Promise.all([
    getPickerTotals(user.id, summaries),
    getAgencyOverview(summaries),
  ])
  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0]
  const names = summaries.map((s) => s.name)

  const cards: WorkspaceCardData[] = summaries.map((s) => ({
    ...s,
    lastActivity: s.lastActivity.toISOString(),
    joinedAt: s.joinedAt.toISOString(),
  }))

  const stats = [
    { icon: LayoutGrid, label: 'Workspaces',         value: pad(totals.workspaces) },
    { icon: Zap,        label: 'Active challenges',  value: pad(totals.activeChallenges) },
    { icon: Users,      label: 'Team members',       value: pad(totals.teamMembers) },
    { icon: UserRound,  label: 'Participants',       value: pad(totals.participants) },
  ]

  return (
    <>
      <UrlToast />

      {/* Same shell as a workspace: a full-height sidebar and scrolling that
          belongs to <main>, so the two levels read as one application. */}
      <GlobalSidebar
        workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
        userName={user.fullName ?? ''}
        userEmail={user.email}
        {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-10 lg:py-12">

          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Dashboard
              </p>
              <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                Everything across your workspaces, in one place.
              </p>
            </div>
            <CreateWorkspace
              createAction={createWorkspaceAction}
              existingNames={names}
              variant="button"
              autoOpen={openCreate !== undefined}
            />
          </header>

          {summaries.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Zap className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                No workspaces yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                A workspace holds your challenges, your team, and your branding.
                Most people only ever need one.
              </p>
              <div className="mt-6 flex justify-center">
                {/* No autoOpen here: the header button above already carries
                    it, and two dialogs opening at once is worse than none. */}
                <CreateWorkspace
                  createAction={createWorkspaceAction}
                  existingNames={names}
                  variant="button"
                />
              </div>
            </div>
          ) : (
            <>
              {/* A strip rather than four cards — this is context for the choice
                  below, not the subject of the page. */}
              <div className="mt-8 grid grid-cols-2 rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
                {stats.map(({ icon: Icon, label, value }, i) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-center gap-3 px-5 py-4',
                      // Two columns: a rule between the pair, and above the
                      // second row. Four columns: rules between all of them and
                      // none above.
                      i % 2 === 1 && 'border-l border-slate-100',
                      i > 1 && 'border-t border-slate-100 lg:border-t-0',
                      i > 0 && 'lg:border-l lg:border-slate-100'
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                            <span className="text-[20px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                        {value}
                      </span>
                      <span className="mt-1 text-[13px] leading-tight text-slate-500">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* The agency view: every workspace at once. The same questions
                  the per-workspace dashboard answers — what is running, who
                  needs attention, what just happened — asked of the whole
                  account, because an agency with five workspaces should not
                  have to open five dashboards to find out. */}
              {/* `items-start` so each column is as tall as its own content. Without
                  it the grid row takes the height of the taller column and the
                  shorter one stretches, leaving a pane of empty white under
                  the last challenge. */}
              <div className="mt-8 grid gap-4 lg:grid-cols-3 lg:items-start">
                <div className="flex flex-col gap-4 lg:col-span-2">
                <section className="rounded-xl border border-slate-200 bg-white">
                  <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                      Live challenges
                    </h2>
                    <span className="text-xs text-slate-500">across all workspaces</span>
                  </header>

                  {agency.challenges.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">
                      Nothing is running yet. A challenge appears here once it is published.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {agency.challenges.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/ws/${c.workspaceSlug}/challenges/${c.slug}/overview`}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-900">
                                {c.title}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {c.workspaceName} · {c.steps} {c.steps === 1 ? 'day' : 'days'}
                                {c.startsAt ? ` · starts ${relativeDay(c.startsAt)}` : ''}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-sm font-semibold tabular-nums text-slate-900">
                                {c.participants}
                              </span>
                              <span className="block text-[11px] text-slate-500">
                                {c.participants === 1 ? 'person' : 'people'}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                  : 'bg-slate-100 text-slate-600'
                              )}
                            >
                              {c.status === 'ACTIVE' ? 'Live' : 'Published'}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                  <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                    Registrations
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Last 30 days, every workspace combined
                  </p>
                  <div className="mt-2">
                    <TimeSeriesChart
                      data={agency.registrations}
                      seriesLabel="Registrations"
                      height={170}
                      emptyMessage="No registrations in the last 30 days."
                    />
                  </div>
                </section>
                </div>

                <div className="flex flex-col gap-4">
                  <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                      Needs your attention
                    </h2>
                    {agency.pendingReviews === 0 && agency.pendingApprovals === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        Nothing is waiting on you.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {agency.pendingReviews > 0 && (
                          <li className="flex items-center gap-2.5 text-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                              <Inbox className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-slate-700">
                              <strong className="font-semibold tabular-nums">
                                {agency.pendingReviews}
                              </strong>{' '}
                              {agency.pendingReviews === 1 ? 'submission' : 'submissions'} to review
                            </span>
                          </li>
                        )}
                        {agency.pendingApprovals > 0 && (
                          <li className="flex items-center gap-2.5 text-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                              <UserRound className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-slate-700">
                              <strong className="font-semibold tabular-nums">
                                {agency.pendingApprovals}
                              </strong>{' '}
                              waiting for approval
                            </span>
                          </li>
                        )}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                      Recent activity
                    </h2>
                    {agency.events.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Nothing has happened yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {agency.events.map((e) => (
                          <li key={e.id} className="text-sm leading-snug">
                            <span className="text-slate-700">
                              <strong className="font-medium text-slate-900">{e.who}</strong>{' '}
                              {e.what}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {e.workspaceName} · {relativeDay(e.at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </div>


              <div id="workspaces" className="mt-10 scroll-mt-6">
                <WorkspaceBrowser
                  workspaces={cards}
                  onCreate={
                    <CreateWorkspace
                      createAction={createWorkspaceAction}
                      existingNames={names}
                      variant="tile"
                    />
                  }
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
