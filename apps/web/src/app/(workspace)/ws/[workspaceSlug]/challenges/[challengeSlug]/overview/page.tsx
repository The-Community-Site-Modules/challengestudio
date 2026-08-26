import Link from 'next/link'
import {
  Users, TrendingUp, CheckCircle, Calendar, Zap,
  ExternalLink, Edit, AlertCircle, Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { StatCard } from '@/components/shared/stat-card'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

const AT_RISK = [
  { name: 'Marcus T.',   lastSeen: '3 days ago', day: 2, total: 5 },
  { name: 'Priya M.',    lastSeen: '2 days ago', day: 1, total: 5 },
  { name: 'James O.',    lastSeen: '4 days ago', day: 3, total: 5 },
]

const RECENT = [
  { text: 'Sarah K. completed Day 3',       time: '4m ago',  color: 'bg-green-500' },
  { text: '6 new registrations today',       time: '1h ago',  color: 'bg-primary' },
  { text: 'Live session tomorrow at 3pm ET', time: '2h ago',  color: 'bg-yellow-500' },
  { text: 'Aisha posted in the feed',        time: '3h ago',  color: 'bg-purple-500' },
  { text: 'Marcus T. submitted Day 2 work',  time: '5h ago',  color: 'bg-green-500' },
]

export default async function ChallengeOverviewPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const base = `/ws/${workspaceSlug}/challenges/${challengeSlug}`

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">5-Day Business Launch Challenge</h1>
              <Badge variant="success">Live</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Marketing Challenge · Aug 12 – 16, 2026 · America/New_York
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/c/${challengeSlug}`} target="_blank" className="gap-1.5">
                <ExternalLink className="h-4 w-4" /> Public page
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`${base}/builder`} className="gap-1.5">
                <Edit className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard label="Registered"      value="247" trend={{ value: 14, label: 'this week' }} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Active (entered)" value="189" sub="76% activation" icon={<Zap className="h-5 w-5" />} />
          <StatCard label="Completed"       value="61%"  trend={{ value: 8, label: 'vs last run' }} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="Offer Clicks"    value="43"   sub="23% of completers" icon={<CheckCircle className="h-5 w-5" />} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Day-by-day completion */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Day-by-day completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { day: 'Orientation', pct: 94, count: 178 },
                { day: 'Day 1 — Your Big Idea',      pct: 88, count: 166 },
                { day: 'Day 2 — Know Your Buyer',    pct: 79, count: 149 },
                { day: 'Day 3 — Craft Your Offer',   pct: 61, count: 115 },
                { day: 'Day 4 — Outreach Plan',      pct: 42, count: 79 },
                { day: 'Day 5 — Make Your First Ask',pct: 0,  count: 0, locked: true },
              ].map(({ day, pct, count, locked }) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-44 truncate text-sm text-foreground shrink-0">{day}</span>
                  <Progress value={pct} className="flex-1 h-2" />
                  <span className={`w-20 text-right text-xs ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {locked ? 'Unlocks Aug 16' : `${pct}% (${count})`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {RECENT.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming session */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Next live session</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Day 4 Q&A — Outreach Plan</p>
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Aug 15, 2026 · 3:00 PM ET
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">Edit</Button>
                  <Button size="sm" className="flex-1">Join link</Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" asChild>
                <Link href={`${base}/live-sessions`}>View all sessions</Link>
              </Button>
            </CardContent>
          </Card>

          {/* At-risk participants */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-base">At-risk participants</CardTitle>
                <Badge variant="warning" className="ml-auto">3 inactive</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {AT_RISK.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last active {p.lastSeen} · Day {p.day}/{p.total}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">Send nudge</Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" asChild>
                <Link href={`${base}/participants`}>View all participants</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
