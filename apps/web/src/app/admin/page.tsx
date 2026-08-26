import Link from 'next/link'
import {
  Building2, Users, Zap, TrendingUp, Activity,
  AlertTriangle, CheckCircle, MinusCircle, XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/shared/stat-card'
import { TimeSeriesChart } from '@/components/shared/time-series-chart'
import {
  getPlatformTotals, getGrowth, getWorkspaceRows, getRecentEvents,
  getServiceStatus, parseRange, RANGES,
  type ServiceStatus,
} from './_lib/queries'

export const metadata = { title: 'Platform Overview — Challenge Studio' }

// Always fresh: an operator looking at this wants the current state, not a
// snapshot from whenever the page was last built.
export const dynamic = 'force-dynamic'

const EVENT_COLOR: Record<string, string> = {
  workspace:   'bg-primary',
  challenge:   'bg-emerald-500',
  participant: 'bg-purple-500',
}

const STATE_ICON: Record<ServiceStatus['state'], React.ReactNode> = {
  'ok':             <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  'not-configured': <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />,
  'error':          <XCircle className="h-3.5 w-3.5 text-destructive" />,
}

function ago(date: Date, now: Date) {
  const mins = Math.round((now.getTime() - date.getTime()) / 60_000)
  if (mins < 1)     return 'just now'
  if (mins < 60)    return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24)   return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30)    return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  searchParams: Promise<{ range?: string }>
}

export default async function AdminOverviewPage({ searchParams }: Props) {
  const now = new Date()
  const range = parseRange((await searchParams).range)

  const [totals, growth, workspaces, events, services] = await Promise.all([
    getPlatformTotals(),
    getGrowth(range),
    getWorkspaceRows(10),
    getRecentEvents(8),
    getServiceStatus(),
  ])

  const topWorkspaces = [...workspaces].sort((a, b) => b.participants - a.participants).slice(0, 5)
  const degraded = services.filter((s: ServiceStatus) => s.state !== 'ok')

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every workspace on this deployment, read live.
        </p>
      </div>

      {/* KPIs. Deltas are "in the last 30 days" from created timestamps — a
          month-over-month comparison would need snapshots nothing records. */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Workspaces" value={totals.workspaces.toLocaleString()}
          sub={`${totals.newWorkspaces} in the last 30 days`}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Users" value={totals.users.toLocaleString()}
          sub={`${totals.newUsers} in the last 30 days`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Live challenges" value={totals.activeChallenges.toLocaleString()}
          sub={`${totals.totalChallenges} total, all statuses`}
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Participants" value={totals.participants.toLocaleString()}
          sub={`${totals.newParticipants} in the last 30 days`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Growth. Three frames rather than three lines on one axis: eight
          workspaces and five hundred participants do not share a scale, and a
          second y-axis is never the answer. */}
      <section aria-labelledby="growth" className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="growth" className="text-lg font-semibold tracking-tight text-foreground">Growth</h2>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={r === 30 ? '/admin' : `/admin?range=${r}`}
                aria-current={range === r ? 'true' : undefined}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}d
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {growth.map((series) => (
            <Card key={series.key}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">{series.label}</CardTitle>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {series.total.toLocaleString()}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">in {range} days</span>
                </p>
              </CardHeader>
              <CardContent className="pt-1">
                <TimeSeriesChart
                  data={series.points}
                  seriesLabel={series.label}
                  height={170}
                  emptyMessage={`No ${series.label.toLowerCase()} in this period.`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mb-8 grid items-start gap-6 lg:grid-cols-2">
        {/* Not uptime monitoring — nothing here pings a provider. The database
            row is a real round trip; the rest reports what is configured. */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Services</CardTitle>
              <Badge variant={degraded.length === 0 ? 'success' : 'warning'} className="ml-auto">
                {degraded.length === 0 ? 'All configured' : `${degraded.length} not configured`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((s: ServiceStatus) => (
              <div key={s.name} className="flex items-start justify-between gap-3 text-sm">
                <span className="shrink-0 text-foreground">{s.name}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-right text-xs text-muted-foreground">{s.detail}</span>
                  {STATE_ICON[s.state]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : events.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_COLOR[e.kind]}`} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs leading-snug text-foreground">{e.text}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{ago(e.at, now)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Top workspaces by participants</CardTitle>
            <Link href="/admin/workspaces" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {topWorkspaces.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No workspaces yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Workspace</span>
                <span>Challenges</span>
                <span>Members</span>
                <span>Participants</span>
              </div>
              <div className="divide-y divide-border">
                {topWorkspaces.map((w) => (
                  <div key={w.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">/ws/{w.slug}</p>
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground">{w.challenges}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{w.members}</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {w.participants.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {degraded.some((s) => s.state === 'error') && (
        <p className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          A service reported an error — see Services above.
        </p>
      )}
    </main>
  )
}
