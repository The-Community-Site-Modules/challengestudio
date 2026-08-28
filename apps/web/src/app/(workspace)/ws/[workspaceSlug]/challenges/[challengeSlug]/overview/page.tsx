// Route: .../challenges/[challengeSlug]/overview
//
// The last of the mock creator pages. It showed 247 registrations, a
// day-by-day curve and an at-risk list of people — Marcus T., Priya M.,
// James O. — who were in no challenge at all, above a real challenge's name.
//
// Everything below is counted from the records, through the same
// challengeMetrics() the analytics page uses, so the two cannot disagree.
// Numbers are shown only to a member who may see analytics; the header and
// the links are the part every member gets.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Users, TrendingUp, CheckCircle, Calendar, Zap,
  ExternalLink, Edit, AlertCircle, Radio, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { StatCard } from '@/components/shared/stat-card'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { challengeMetrics } from '@/lib/analytics/challenge-metrics'
import { recentActivity, type ActivityKind } from '@/lib/analytics/activity'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Overview — Challenge Studio' }

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  DRAFT:     'secondary',
  PUBLISHED: 'default',
  ACTIVE:    'success',
  COMPLETED: 'secondary',
  ARCHIVED:  'secondary',
}

const DOT: Record<ActivityKind, string> = {
  registered: 'bg-primary',
  submitted:  'bg-green-500',
  posted:     'bg-purple-500',
  commented:  'bg-yellow-500',
}

/** "4m ago", "3h ago", "2d ago" — enough precision for a glance. */
function ago(then: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function dateRange(startsAt: Date | null, endsAt: Date | null, timezone: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const parts: string[] = []
  if (startsAt && endsAt) {
    parts.push(`${startsAt.toLocaleDateString(undefined, opts)} – ${endsAt.toLocaleDateString(undefined, opts)}`)
  } else if (startsAt) {
    parts.push(`starts ${startsAt.toLocaleDateString(undefined, opts)}`)
  } else {
    parts.push('no dates set')
  }
  if (timezone) parts.push(timezone)
  return parts.join(' · ')
}

export default async function ChallengeOverviewPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)
  const base = `/ws/${workspaceSlug}/challenges/${challengeSlug}`
  const now = new Date()

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      id: true, title: true, status: true,
      startsAt: true, endsAt: true, timezone: true,
    },
  })
  if (!challenge) notFound()

  const [canSeeAnalytics, canEdit] = await Promise.all([
    hasPermission(user.id, workspace.id, 'analytics.view'),
    hasPermission(user.id, workspace.id, 'challenge.edit'),
  ])

  const [metrics, activity, nextSession] = await Promise.all([
    canSeeAnalytics ? challengeMetrics(challenge.id, now) : null,
    canSeeAnalytics ? recentActivity(challenge.id, 8) : [],
    db.liveSession.findFirst({
      where:   { challengeId: challenge.id, startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      select:  { id: true, title: true, startsAt: true, joinUrl: true },
    }),
  ])

  // Deliberately not a percentage: a click is an event, not a person, so one
  // enthusiastic participant can produce several. "300% of completers" is what
  // the tempting version prints.
  const offerHint = metrics?.offerClicks === 1 ? 'link opened once' : 'link opens'

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{challenge.title}</h1>
              <Badge variant={STATUS_VARIANT[challenge.status] ?? 'secondary'}>
                {String(challenge.status).toLowerCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dateRange(challenge.startsAt, challenge.endsAt, challenge.timezone)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/c/${challengeSlug}`} target="_blank" className="gap-1.5">
                <ExternalLink className="h-4 w-4" /> Public page
              </Link>
            </Button>
            {canEdit && (
              <Button size="sm" asChild>
                <Link href={`${base}/builder`} className="gap-1.5">
                  <Edit className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </div>
        </div>

        {!metrics ? (
          <Card>
            <CardContent className="p-10 text-center">
              <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Your role does not include viewing analytics for this workspace.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Registered"
                value={metrics.registrations}
                sub={`${metrics.dayByDay.length} published steps`}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Active (entered)"
                value={metrics.activated}
                sub={`${metrics.activationRate}% activation`}
                icon={<Zap className="h-5 w-5" />}
              />
              <StatCard
                label="Completed"
                value={`${metrics.completionRate}%`}
                sub={`${metrics.completed} of ${metrics.registrations}`}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                label="Offer clicks"
                value={metrics.offerClicks}
                sub={offerHint}
                icon={<CheckCircle className="h-5 w-5" />}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Day-by-day completion */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Day-by-day completion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metrics.dayByDay.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No published steps yet.
                    </p>
                  ) : metrics.dayByDay.map((d) => {
                    const rate = d.reached > 0 ? Math.round((d.completed / d.reached) * 100) : 0
                    return (
                      <div key={d.stepId} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 truncate text-sm text-foreground">{d.title}</span>
                        <Progress value={rate} className="h-2 flex-1" />
                        <span className={`w-24 text-right text-xs ${d.reached === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {d.reached === 0 ? 'not open yet' : `${rate}% (${d.completed})`}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Recent activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activity.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nothing has happened yet.
                    </p>
                  ) : activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[item.kind]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-foreground">
                          {item.name} {item.detail}
                        </p>
                        <p className="text-xs text-muted-foreground">{ago(item.at, now)}</p>
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
                  {nextSession ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <p className="text-sm font-semibold text-foreground">{nextSession.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {nextSession.startsAt.toLocaleString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {nextSession.joinUrl && (
                        <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                          <Link href={nextSession.joinUrl} target="_blank" rel="noopener noreferrer">
                            Join link
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      Nothing scheduled.
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" asChild>
                    <Link href={`${base}/live-sessions`}>View all sessions</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* At-risk participants */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${metrics.atRisk.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-base">At-risk participants</CardTitle>
                    {metrics.atRisk.length > 0 && (
                      <Badge variant="warning" className="ml-auto">
                        {metrics.atRisk.length} inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {metrics.atRisk.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nobody has gone quiet for three days or more.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {metrics.atRisk.slice(0, 5).map((p) => (
                        <div key={p.participantId} className="flex items-center justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.daysSinceActivity === null
                                ? 'never started'
                                : `last active ${p.daysSinceActivity} days ago`}
                              {' · '}{p.completedSteps}/{p.totalSteps} steps
                            </p>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`${base}/participants/${p.participantId}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground" asChild>
                    <Link href={`${base}/participants`}>View all participants</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
