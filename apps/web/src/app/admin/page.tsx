import {
  Building2, Users, Zap, Activity,
  TrendingUp, AlertTriangle, CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/shared/stat-card'
import { MiniBarChart } from '@/components/shared/mini-bar-chart'

const WORKSPACE_SIGNUPS = [
  { label: 'Mon', value: 3 }, { label: 'Tue', value: 7 }, { label: 'Wed', value: 5 },
  { label: 'Thu', value: 11 }, { label: 'Fri', value: 9 }, { label: 'Sat', value: 4 },
  { label: 'Sun', value: 6 },
]

const RECENT_EVENTS = [
  { type: 'workspace', text: 'New workspace created — "Mindset Mastery Co."',    time: '4m ago',  color: 'bg-primary' },
  { type: 'challenge', text: 'Challenge published — "30-Day Fitness Sprint"',     time: '18m ago', color: 'bg-green-500' },
  { type: 'alert',     text: 'Email bounce rate spike on workspace "FitLife Pro"',time: '1h ago',  color: 'bg-yellow-500' },
  { type: 'user',      text: '14 new user registrations today',                    time: '2h ago',  color: 'bg-purple-500' },
  { type: 'challenge', text: 'Challenge "5-Day Launch" reached 250 participants',  time: '3h ago',  color: 'bg-green-500' },
  { type: 'alert',     text: 'Storage usage at 82% on workspace "AgencyPro"',      time: '5h ago',  color: 'bg-orange-500' },
]

const TOP_WORKSPACES = [
  { name: 'Acme Coaching',   challenges: 4, participants: 612, status: 'active' },
  { name: 'FitLife Pro',     challenges: 7, participants: 1840, status: 'active' },
  { name: 'Mindset Masters', challenges: 2, participants: 189, status: 'active' },
  { name: 'AgencyPro',       challenges: 12, participants: 3402, status: 'active' },
  { name: 'Launch Academy',  challenges: 3, participants: 441, status: 'trial' },
]

export default function AdminOverviewPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time snapshot of Challenge Studio across all workspaces.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total workspaces"   value="47"    trend={{ value: 12, label: 'this month' }} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Total users"        value="8,241" trend={{ value: 8,  label: 'this month' }} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active challenges"  value="134"   sub="23 published today"                   icon={<Zap className="h-5 w-5" />} />
        <StatCard label="Total participants" value="62.4k" trend={{ value: 19, label: 'this month' }} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Workspace signups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New workspaces (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-foreground mb-4">45</p>
            <MiniBarChart bars={WORKSPACE_SIGNUPS} height={80} showLabels />
          </CardContent>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <CardTitle className="text-base">System health</CardTitle>
              <Badge variant="success" className="ml-auto">All systems operational</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'API',             status: 'ok',   latency: '42ms' },
              { name: 'Database',        status: 'ok',   latency: '8ms' },
              { name: 'File storage',    status: 'ok',   latency: '120ms' },
              { name: 'Email delivery',  status: 'warn', latency: '—' },
              { name: 'Background jobs', status: 'ok',   latency: '—' },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${s.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-foreground">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {s.latency !== '—' && (
                    <span className="text-xs text-muted-foreground">{s.latency}</span>
                  )}
                  {s.status === 'warn' && (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                  )}
                  {s.status === 'ok' && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {RECENT_EVENTS.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground leading-snug line-clamp-2">{e.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{e.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top workspaces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top workspaces by participants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_80px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Workspace</span>
            <span>Challenges</span>
            <span>Participants</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-border">
            {TOP_WORKSPACES.map((ws) => (
              <div key={ws.name} className="grid grid-cols-[2fr_1fr_1fr_80px] items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                <p className="text-sm font-medium text-foreground">{ws.name}</p>
                <p className="text-sm text-muted-foreground">{ws.challenges}</p>
                <p className="text-sm font-semibold text-foreground">{ws.participants.toLocaleString()}</p>
                <Badge variant={ws.status === 'active' ? 'success' : 'secondary'} className="text-[10px] w-fit">
                  {ws.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
