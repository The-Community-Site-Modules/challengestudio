import { redirect } from 'next/navigation'
import Link         from 'next/link'
import {
  ArrowRight, Flame, Zap,
  CheckCircle, Lock,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ProgressRing }     from '@/components/participant/progress-ring'
import { getCurrentUser }   from '@/lib/auth/session'
import { getParticipantProgress } from '../actions'
import { db } from '@/lib/db'
import { badgeByKey } from '@/lib/gamification'

interface Props {
  params: Promise<{ challengeSlug: string }>
}

export default async function ChallengeHubPage({ params }: Props) {
  const { challengeSlug } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/hub`)
  }

  const progress = await getParticipantProgress(challengeSlug, user.id)

  if (!progress) {
    // Not enrolled — redirect to registration
    redirect(`/c/${challengeSlug}`)
  }

  // Registered but not yet approved — the hub is the challenge itself, so it
  // stays shut until a creator lets them in. The welcome page explains the wait.
  if (progress.participant.status === 'PENDING') {
    redirect(`/c/${challengeSlug}/welcome`)
  }

  const { participant, steps, streak, xp, progressPct, completedCount, totalRequired } = progress

  // Badges are awarded on completion but nothing rendered them, so nobody
  // could see what they had earned.
  const awards = await db.badgeAward.findMany({
    where:   { participantId: participant.id },
    orderBy: { awardedAt: 'asc' },
    select:  { badgeKey: true },
  })
  const badges = awards
    .map(a => badgeByKey(a.badgeKey))
    .filter((b): b is NonNullable<typeof b> => b !== undefined)

  // Live sessions. joinUrl is selected here because this page is already
  // behind enrolment — PRD §16 asks that join links stay off public surfaces.
  const now = new Date()
  const sessions = await db.liveSession.findMany({
    where:   { challenge: { slug: challengeSlug } },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true, title: true, startsAt: true, durationMinutes: true,
      hostName: true, joinUrl: true, replayUrl: true,
    },
  })
  const upcoming = sessions.filter(s => s.startsAt >= now).slice(0, 3)
  const replays  = sessions.filter(s => s.startsAt < now && s.replayUrl).slice(0, 3)

  // Only shown once they have finished, and only if the creator turned it on.
  const offer = completedCount >= totalRequired && totalRequired > 0
    ? await db.offer.findFirst({
        where:  { challenge: { slug: challengeSlug }, enabled: true },
        select: { headline: true },
      })
    : null
  const base = `/c/${challengeSlug}`

  // Find today's active step (first unlocked but not completed)
  const todayStep = steps.find(s => s.status === 'active')
    ?? steps.find(s => s.unlocked && !s.isCompleted)

  const firstName = user.fullName?.split(' ')[0] ?? user.email.split('@')[0]

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Main column ──────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">
                {streak > 0 ? `🔥 ${streak}-day streak, ${firstName}!` : `Welcome, ${firstName}!`}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {completedCount} of {steps.length} steps completed
              </p>
            </div>

            {/* Today's card */}
            {todayStep ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -right-4 h-24 w-24 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      Step {todayStep.order + 1} of {steps.length}
                    </Badge>
                    {streak > 0 && (
                      <div className="flex items-center gap-1.5 text-white/80 text-sm">
                        <Flame className="h-4 w-4 text-orange-300" />
                        <span className="font-bold text-white">{streak}-day streak</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{todayStep.title}</h2>
                  <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
                    {todayStep.estimatedMinutes && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> {todayStep.estimatedMinutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" /> {todayStep.pointsXp ?? 100} XP
                    </span>
                  </div>
                  <Button asChild className="mt-6 bg-white text-primary hover:bg-white/90 font-bold w-full sm:w-auto gap-2">
                    <Link href={`${base}/day/${todayStep.order + 1}`}>
                      {todayStep.status === 'active' ? 'Continue' : 'Start'} Step {todayStep.order + 1}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6 text-center space-y-2">
                <div className="text-4xl">🎉</div>
                <h2 className="text-xl font-bold text-green-800">Challenge complete!</h2>
                <p className="text-sm text-green-600">You finished all {steps.length} steps. Amazing work.</p>
                <Button asChild className="mt-2">
                  <Link href={`${base}/complete`}>See your results →</Link>
                </Button>
              </div>
            )}

            {/* Step list */}
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {steps.map((step) => (
                  <Link
                    key={step.id}
                    href={step.status !== 'locked' ? `${base}/day/${step.order + 1}` : '#'}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                      step.status === 'locked'
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      step.isCompleted ? 'bg-green-100 text-green-600' :
                      step.status === 'active' ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {step.isCompleted ? <CheckCircle className="h-5 w-5" /> :
                       step.status === 'locked' ? <Lock className="h-5 w-5" /> :
                       <span className="text-sm font-bold">{step.order + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{step.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {step.isCompleted ? `Completed · ${step.pointsXp ?? 100} XP earned` :
                         step.status === 'active' ? 'In progress — continue now' :
                         step.availableAt
                           ? `Unlocks ${new Date(step.availableAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                           : 'Locked'}
                      </p>
                    </div>
                    {step.status === 'active' && (
                      <Badge variant="default" className="shrink-0">Today</Badge>
                    )}
                    {step.isCompleted && (
                      <Badge variant="success" className="shrink-0">Done</Badge>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>

          </div>

          {/* ── Right sidebar ──────────────────────────────────── */}
          <div className="space-y-4">

            {/* Progress ring */}
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-5">
                <ProgressRing value={progressPct} />
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">{progressPct}% complete</p>
                  <p className="text-xs text-muted-foreground">
                    {completedCount} of {totalRequired} required steps
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-foreground">{streak}</p>
                    <p className="text-[10px] text-muted-foreground">day streak</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-foreground">{xp}</p>
                    <p className="text-[10px] text-muted-foreground">XP earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live sessions */}
            {(upcoming.length > 0 || replays.length > 0) && (
              <Card>
                <CardContent className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live sessions
                  </p>
                  <div className="space-y-3">
                    {upcoming.map((s) => (
                      <div key={s.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">{s.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.startsAt.toLocaleString(undefined, {
                            weekday: 'short', day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                          {s.hostName ? ` · ${s.hostName}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          {s.joinUrl && (
                            <a href={s.joinUrl} target="_blank" rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline">
                              Join
                            </a>
                          )}
                          <a href={`${base}/sessions/${s.id}/calendar`}
                            className="text-muted-foreground hover:text-foreground">
                            Add to calendar
                          </a>
                        </div>
                      </div>
                    ))}
                    {replays.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-muted-foreground">{s.title}</span>
                        <a href={s.replayUrl!} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 font-medium text-primary hover:underline">
                          Watch replay
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Offer, once they have finished */}
            {offer && (
              <Card>
                <CardContent className="p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Next step
                  </p>
                  <p className="text-sm font-medium text-foreground">{offer.headline}</p>
                  <Link href={`${base}/offer`}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Take a look <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Badges */}
            <Card>
              <CardContent className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Badges
                </p>
                {badges.length === 0 ? (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    None yet. Completing your first step earns one.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {badges.map((b) => (
                      <div
                        key={b.key}
                        title={b.description}
                        className="flex w-14 flex-col items-center gap-1 text-center"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-xl ring-1 ring-amber-100">
                          {b.icon}
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {b.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick links</p>
                {[
                  { label: 'Community feed',  href: `${base}/feed` },
                  { label: 'Leaderboard',     href: `${base}/leaderboard` },
                ].map(({ label, href }) => (
                  <Link key={label} href={href}
                    className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    {label}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  )
}
