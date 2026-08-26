import {
  Users, CheckCircle, MousePointerClick,
  Download, Zap, Flame, AlertCircle,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { MiniBarChart } from '@/components/shared/mini-bar-chart'
import { Sparkline } from '@/components/shared/sparkline'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

// ── Mock data ──────────────────────────────────────────────────────────────
const DAILY_REGISTRATIONS = [
  { label: 'Aug 1', value: 12 }, { label: 'Aug 2', value: 19 }, { label: 'Aug 3', value: 8 },
  { label: 'Aug 4', value: 24 }, { label: 'Aug 5', value: 31 }, { label: 'Aug 6', value: 15 },
  { label: 'Aug 7', value: 28 }, { label: 'Aug 8', value: 41 }, { label: 'Aug 9', value: 22 },
  { label: 'Aug 10', value: 17 }, { label: 'Aug 11', value: 30 }, { label: 'Aug 12', value: 0 },
]

const DAY_COMPLETION = [
  { label: 'Orient', value: 94 }, { label: 'Day 1', value: 88 },
  { label: 'Day 2', value: 79 }, { label: 'Day 3', value: 61 },
  { label: 'Day 4', value: 42 }, { label: 'Day 5', value: 0 },
]

const PARTICIPANTS = [
  { id: 'p1', initials: 'AP', name: 'Aisha Patel',    email: 'aisha@example.com', status: 'active',    day: 3, xp: 775,  streak: 3, submissions: 8,  lastSeen: 'Today',      risk: false },
  { id: 'p2', initials: 'TK', name: 'Tom Kato',       email: 'tom@example.com',   status: 'active',    day: 2, xp: 650,  streak: 2, submissions: 5,  lastSeen: 'Today',      risk: false },
  { id: 'p3', initials: 'MJ', name: 'Marcus James',   email: 'marcus@example.com',status: 'active',    day: 3, xp: 850,  streak: 3, submissions: 10, lastSeen: 'Today',      risk: false },
  { id: 'p4', initials: 'PR', name: 'Priya Rajan',    email: 'priya@example.com', status: 'at_risk',   day: 1, xp: 100,  streak: 0, submissions: 1,  lastSeen: '3 days ago', risk: true },
  { id: 'p5', initials: 'SW', name: 'Sam Williams',   email: 'sam@example.com',   status: 'at_risk',   day: 2, xp: 200,  streak: 0, submissions: 2,  lastSeen: '2 days ago', risk: true },
  { id: 'p6', initials: 'LN', name: 'Lisa Nguyen',    email: 'lisa@example.com',  status: 'active',    day: 2, xp: 325,  streak: 1, submissions: 4,  lastSeen: 'Yesterday',  risk: false },
  { id: 'p7', initials: 'JD', name: 'James Doran',    email: 'james@example.com', status: 'withdrawn', day: 1, xp: 100,  streak: 0, submissions: 1,  lastSeen: '5 days ago', risk: false },
  { id: 'p8', initials: 'KC', name: 'Karen Chen',     email: 'karen@example.com', status: 'active',    day: 3, xp: 540,  streak: 2, submissions: 7,  lastSeen: 'Today',      risk: false },
]

const regSparkData = DAILY_REGISTRATIONS.map(d => d.value)

function StatBlock({
  label, value, sub, trend, icon, sparkData,
}: {
  label: string; value: string; sub?: string
  trend?: { value: number; positive: boolean }
  icon: React.ReactNode
  sparkData?: number[]
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          {sparkData && <Sparkline data={sparkData} fill />}
        </div>
        <p className="mt-3 text-3xl font-extrabold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {(sub || trend) && (
          <div className="mt-1.5 flex items-center gap-2">
            {trend && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-500'}`}>
                {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend.value)}%
              </span>
            )}
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const statusConfig: Record<string, { label: string; class: string }> = {
  active:    { label: 'Active',     class: 'bg-green-100 text-green-700' },
  at_risk:   { label: 'At risk',    class: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed',  class: 'bg-blue-100 text-blue-700' },
  withdrawn: { label: 'Withdrawn',  class: 'bg-muted text-muted-foreground' },
}

export default async function AnalyticsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName="Acme Coaching"
        challengeSlug={challengeSlug}
        challengeTitle="5-Day Launch"
      />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              5-Day Business Launch Challenge · Aug 12–16, 2026
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatBlock label="Total registered"  value="247" trend={{ value: 14, positive: true }} sub="vs last run"    icon={<Users className="h-4 w-4" />} sparkData={regSparkData} />
          <StatBlock label="Activation rate"   value="76%" trend={{ value: 5,  positive: true }} sub="entered hub"    icon={<Zap className="h-4 w-4" />} />
          <StatBlock label="Completion rate"   value="61%" trend={{ value: 8,  positive: true }} sub="vs last run"    icon={<CheckCircle className="h-4 w-4" />} />
          <StatBlock label="Offer CTA clicks"  value="43"  trend={{ value: 3,  positive: false }} sub="23% of completers" icon={<MousePointerClick className="h-4 w-4" />} />
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">

          {/* Registrations over time */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Registrations over time</CardTitle>
                <Badge variant="secondary">247 total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <MiniBarChart bars={DAILY_REGISTRATIONS} height={140} showLabels showValues />
            </CardContent>
          </Card>

          {/* Day-by-day completion funnel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Completion funnel</CardTitle>
                <Badge variant="secondary">61% avg</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAY_COMPLETION.map((day) => (
                <div key={day.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground text-right">{day.label}</span>
                  <div className="flex-1">
                    <Progress value={day.value} className="h-5 rounded-md" />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-foreground">
                    {day.value > 0 ? `${day.value}%` : '—'}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Day 5 unlocks Aug 16</p>
            </CardContent>
          </Card>

          {/* Submission rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submission rate by day</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { day: 'Day 1', required: 88, optional: 72 },
                { day: 'Day 2', required: 71, optional: 58 },
                { day: 'Day 3', required: 54, optional: 41 },
              ].map((row) => (
                <div key={row.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{row.day}</span>
                    <span className="text-muted-foreground">{row.required}% required · {row.optional}% optional</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${row.optional}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${row.required}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Community engagement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Community engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Feed posts',       value: 312, icon: '✍️' },
                  { label: 'Comments',          value: 847, icon: '💬' },
                  { label: 'Reactions',         value: '2.1k', icon: '❤️' },
                  { label: 'Participation rate',value: '68%', icon: '👥' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                    <div className="text-2xl">{s.icon}</div>
                    <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participant table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Participants ({PARTICIPANTS.length} shown)</CardTitle>
              <div className="flex items-center gap-2">
                <Tabs defaultValue="all">
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-2.5">All (247)</TabsTrigger>
                    <TabsTrigger value="active" className="text-xs px-2.5">Active (189)</TabsTrigger>
                    <TabsTrigger value="risk" className="text-xs px-2.5 text-yellow-600">At risk (14)</TabsTrigger>
                    <TabsTrigger value="complete" className="text-xs px-2.5">Completed (61)</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="outline" size="sm" className="gap-1.5 h-8">
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_100px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Participant</span>
              <span>Status</span>
              <span>Progress</span>
              <span>XP</span>
              <span>Streak</span>
              <span>Last active</span>
              <span></span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {PARTICIPANTS.map((p) => {
                const status = statusConfig[p.status] ?? statusConfig.active
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_100px] items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors ${p.risk ? 'bg-yellow-50/50' : ''}`}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {p.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      </div>
                      {p.risk && <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.class}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Day {p.day}/5</p>
                      <Progress value={(p.day / 5) * 100} className="h-1.5 w-20" />
                    </div>

                    {/* XP */}
                    <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      {p.xp}
                    </div>

                    {/* Streak */}
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      {p.streak > 0 ? (
                        <><Flame className="h-3.5 w-3.5 text-orange-400" />{p.streak}d</>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>

                    {/* Last active */}
                    <p className="text-xs text-muted-foreground">{p.lastSeen}</p>

                    {/* Actions */}
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">View</Button>
                      {p.risk && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Nudge</Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Load more */}
            <div className="border-t border-border px-5 py-4 text-center">
              <Button variant="outline" size="sm">Load more participants</Button>
              <p className="mt-1 text-xs text-muted-foreground">Showing 8 of 247</p>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  )
}
