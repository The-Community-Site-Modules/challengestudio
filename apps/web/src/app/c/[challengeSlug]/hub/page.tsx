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

  const { steps, streak, xp, progressPct, completedCount, totalRequired } = progress
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
