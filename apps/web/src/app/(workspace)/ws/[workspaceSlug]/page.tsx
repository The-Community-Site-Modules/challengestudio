import Link from 'next/link'
import {
  Plus, Search, Bell, Layers, Users, Trophy, Flame,
  ArrowRight, Inbox, CalendarClock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { TimeSeriesChart, type TimePoint } from '@/components/shared/time-series-chart'

interface Props {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ filter?: string }>
}

// Live and scheduled first — a draft nobody can see should not lead the page.
// Postgres orders an enum by its declaration, which puts DRAFT first, so the
// order is applied here rather than in the query.
const STATUS_RANK: Record<string, number> = {
  ACTIVE: 0, PUBLISHED: 1, DRAFT: 2, COMPLETED: 3, ARCHIVED: 4,
}

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'drafts', label: 'Drafts' },
] as const

// Gradient headers, assigned by position so a challenge keeps its look between
// visits. Decoration, not encoding — status is carried by the badge and its text.
const COVERS = [
  'from-violet-500 via-purple-500 to-fuchsia-400',
  'from-orange-500 to-amber-400',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
]

const STATUS_STYLE: Record<string, { label: string; className: string; dot: boolean }> = {
  ACTIVE:    { label: 'Live',      className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: true },
  PUBLISHED: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 ring-blue-600/20',          dot: false },
  DRAFT:     { label: 'Draft',     className: 'bg-muted text-muted-foreground ring-border',         dot: false },
  COMPLETED: { label: 'Completed', className: 'bg-muted text-muted-foreground ring-border',         dot: false },
  ARCHIVED:  { label: 'Archived',  className: 'bg-muted text-muted-foreground ring-border',         dot: false },
}

function greeting(now: Date) {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Days elapsed since the start, clamped to the challenge length. */
function dayOf(startsAt: Date, steps: number, now: Date) {
  const elapsed = Math.floor((now.getTime() - startsAt.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(elapsed, 1), steps)
}

function pctOf(startsAt: Date, steps: number, now: Date) {
  return Math.round((dayOf(startsAt, steps, now) / steps) * 100)
}

function startsIn(startsAt: Date, now: Date) {
  const days = Math.ceil((startsAt.getTime() - now.getTime()) / 86_400_000)
  if (days <= 0) return 'Starting today'
  return `Starts in ${days} day${days === 1 ? '' : 's'}`
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function WorkspaceDashboardPage({ params, searchParams }: Props) {
  const { workspaceSlug } = await params
  const { filter: rawFilter } = await searchParams
  const filter = FILTERS.some((f) => f.key === rawFilter) ? rawFilter! : 'all'
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  const now = new Date()
  const since30 = startOfDayUTC(new Date(now.getTime() - 29 * 86_400_000))
  const since7  = new Date(now.getTime() - 7 * 86_400_000)

  // Explicit selects: the live database is still missing the columns from
  // add_challenge_fields.sql, and selecting the whole row would fail on them.
  const [challenges, participantCount, completedCount, activeThisWeek, pendingReview, recent] =
    await Promise.all([
      db.challenge.findMany({
        where:   { workspaceId: workspace.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, description: true,
          status: true, startsAt: true,
          _count: { select: { participants: true, steps: true } },
        },
      }),
      db.participant.count({ where: { challenge: { workspaceId: workspace.id } } }),
      db.participant.count({ where: { challenge: { workspaceId: workspace.id }, status: 'COMPLETED' } }),
      db.participant.count({
        where: {
          challenge: { workspaceId: workspace.id },
          submissions: { some: { submittedAt: { gte: since7 } } },
        },
      }),
      db.submission.count({ where: { participant: { challenge: { workspaceId: workspace.id } } } }),
      db.participant.findMany({
        where:  { challenge: { workspaceId: workspace.id }, registeredAt: { gte: since30 } },
        select: { registeredAt: true },
      }),
    ])

  const ordered = [...challenges].sort(
    (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)
  )
  const visible = ordered.filter((c) =>
    filter === 'active' ? c.status === 'ACTIVE' || c.status === 'PUBLISHED'
      : filter === 'drafts' ? c.status === 'DRAFT'
      : true
  ).slice(0, 6)

  const activeChallenges = challenges.filter((c) => c.status === 'ACTIVE' || c.status === 'PUBLISHED').length
  const completionRate = participantCount > 0 ? Math.round((completedCount / participantCount) * 100) : 0

  // Bucket registrations by UTC day, keeping empty days so the axis is evenly
  // spaced rather than skipping to the next day that happens to have data.
  const buckets = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30.getTime() + i * 86_400_000)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const r of recent) {
    const key = r.registeredAt.toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const activity: TimePoint[] = participantCount > 0
    ? [...buckets].map(([date, value]) => ({ date, value }))
    : []

  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0]
  const stats = [
    { label: 'Active Challenges',  value: activeChallenges,      Icon: Layers, tint: 'bg-blue-50 text-blue-600',       badge: 'bg-blue-50 text-blue-700',       note: `${challenges.length} total` },
    { label: 'Total Participants', value: participantCount,       Icon: Users,  tint: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', note: 'all challenges' },
    { label: 'Completion Rate',    value: `${completionRate}%`,   Icon: Trophy, tint: 'bg-violet-50 text-violet-600',   badge: 'bg-violet-50 text-violet-700',   note: `${completedCount} finished` },
    { label: 'Active This Week',   value: activeThisWeek,         Icon: Flame,  tint: 'bg-orange-50 text-orange-600',   badge: 'bg-orange-50 text-orange-700',   note: 'submitted in 7 days' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        submissionCount={pendingReview}
      />

      <main className="flex-1 overflow-y-auto bg-muted/30">

        {/* Header */}
        <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-8 py-5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
              {greeting(now)}, {firstName}!
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your challenges today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search…"
                aria-label="Search challenges"
                className="h-10 w-56 rounded-full border border-input bg-muted/50 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-background"
              />
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
            </button>
            <Button asChild className="gap-1.5 rounded-lg">
              <Link href={`/ws/${workspaceSlug}/challenges/new`}>
                <Plus className="h-4 w-4" /> Create Challenge
              </Link>
            </Button>
          </div>
        </header>

        <div className="p-8">

          {/* Stats */}
          <section aria-label="Workspace summary" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, Icon, tint, badge, note }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
                    {note}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

            {/* Challenges */}
            <section aria-labelledby="your-challenges">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="your-challenges" className="text-lg font-semibold tracking-tight text-foreground">
                  Your Challenges
                </h2>
                {challenges.length > 0 && (
                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Filter challenges">
                    {FILTERS.map((f) => (
                      <Link
                        key={f.key}
                        href={f.key === 'all' ? `/ws/${workspaceSlug}` : `/ws/${workspaceSlug}?filter=${f.key}`}
                        role="tab"
                        aria-selected={filter === f.key}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                          filter === f.key
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {f.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {visible.map((c, i) => {
                  const status = STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT!
                  return (
                    <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className={`relative h-28 bg-gradient-to-br ${COVERS[i % COVERS.length]}`}>
                        <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[11px] font-semibold ring-1 ${status.className}`}>
                          {status.dot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          {status.label}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="font-semibold leading-snug text-foreground">{c.title}</h3>
                        {c.description && (
                          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                        )}

                        {/* A running challenge gets elapsed progress; one that has not
                            started gets its start date. Neither is useful for a draft. */}
                        {c.status === 'ACTIVE' && c.startsAt && c._count.steps > 0 ? (
                          <div className="mt-4">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-muted-foreground">
                                Day {dayOf(c.startsAt, c._count.steps, now)} of {c._count.steps}
                              </span>
                              <span className="font-medium text-foreground">
                                {pctOf(c.startsAt, c._count.steps, now)}% elapsed
                              </span>
                            </div>
                            <div
                              className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={pctOf(c.startsAt, c._count.steps, now)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${c.title} progress`}
                            >
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${pctOf(c.startsAt, c._count.steps, now)}%` }}
                              />
                            </div>
                          </div>
                        ) : c.status === 'PUBLISHED' && c.startsAt ? (
                          <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
                              <CalendarClock className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">{startsIn(c.startsAt, now)}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.startsAt.toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
                                })}
                                {' • '}{c._count.participants} registered
                              </p>
                            </div>
                          </div>
                        ) : null}

                        <dl className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <dt className="sr-only">Participants</dt>
                            <dd className="tabular-nums">{c._count.participants}</dd>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5" />
                            <dt className="sr-only">Steps</dt>
                            <dd className="tabular-nums">{c._count.steps}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                          <span className="text-xs text-muted-foreground">
                            {c._count.steps === 0 ? 'No steps yet' : `${c._count.steps} steps`}
                          </span>
                          <Link
                            href={`/ws/${workspaceSlug}/challenges/${c.slug}/builder`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Manage <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}

                {/* Create */}
                <Link
                  href={`/ws/${workspaceSlug}/challenges/new`}
                  className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="h-6 w-6" />
                  </span>
                  <span className="font-semibold text-foreground">Create New Challenge</span>
                  <span className="max-w-[200px] text-sm text-muted-foreground">
                    Start building a new transformation journey for your audience.
                  </span>
                  <span className="mt-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-foreground">
                    Start Building
                  </span>
                </Link>
              </div>
            </section>

            {/* Side column */}
            <div className="space-y-6">

              <section aria-labelledby="attention" className="rounded-xl border border-border bg-card p-5">
                <h2 id="attention" className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Needs Your Attention
                </h2>

                <div className="mt-4 space-y-4">
                  {pendingReview > 0 && (
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Inbox className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {pendingReview} submission{pendingReview === 1 ? '' : 's'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Waiting to be reviewed.</p>
                        <Link
                          href={`/ws/${workspaceSlug}/submissions`}
                          className="mt-2 inline-block rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                        >
                          Review submissions
                        </Link>
                      </div>
                    </div>
                  )}

                  {challenges.some((c) => c.status === 'DRAFT') && (
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <CalendarClock className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {challenges.filter((c) => c.status === 'DRAFT').length} draft challenge
                          {challenges.filter((c) => c.status === 'DRAFT').length === 1 ? '' : 's'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Not visible to anyone yet.</p>
                        <Link
                          href={`/ws/${workspaceSlug}/challenges`}
                          className="mt-2 inline-block rounded-md border border-input px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          Finish setup
                        </Link>
                      </div>
                    </div>
                  )}

                  {pendingReview === 0 && !challenges.some((c) => c.status === 'DRAFT') && (
                    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Nothing needs you right now.
                    </p>
                  )}
                </div>
              </section>

              <section aria-labelledby="activity" className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="activity" className="text-base font-semibold text-foreground">
                    Participant Activity
                  </h2>
                  <span className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground">
                    Last 30 days
                  </span>
                </div>
                <TimeSeriesChart
                  data={activity}
                  seriesLabel="Registrations"
                  emptyMessage="No registrations yet. This fills in as people join your challenges."
                />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
