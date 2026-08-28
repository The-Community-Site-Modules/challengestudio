import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Progress }  from '@/components/ui/progress'
import { getCurrentUser } from '@/lib/auth/session'
import { db }            from '@/lib/db'

interface Props {
  params: Promise<{ challengeSlug: string }>
}

export default async function WelcomePage({ params }: Props) {
  const { challengeSlug } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/welcome`)
  }

  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true, startsAt: true, timezone: true,
      workspace: { select: { name: true } },
      steps: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, stepType: true, availableAt: true },
      },
    },
  })

  if (!challenge) redirect('/dashboard')

  // Verify enrollment
  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, registeredAt: true, status: true },
  })

  if (!participant) {
    redirect(`/c/${challengeSlug}`)
  }

  const firstName = user.fullName?.split(' ')[0] ?? user.email.split('@')[0]

  // Approval-gated challenges park people on PENDING. Telling them "you're in"
  // and handing them the schedule would be a lie — they have not been let in yet.
  const awaitingApproval = participant.status === 'PENDING'

  const startDate = challenge.startsAt
    ? challenge.startsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null

  const setupItems = [
    { label: 'Account created',        done: true },
    { label: 'Add challenge to calendar', done: false },
    { label: 'Introduce yourself in feed', done: false },
  ]
  const setupDone = setupItems.filter(i => i.done).length
  const setupPct  = Math.round((setupDone / setupItems.length) * 100)

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-2xl px-4 py-12 space-y-8">

        {/* Welcome hero */}
        {awaitingApproval ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-3">
            <Badge className="bg-amber-100 text-amber-900">Awaiting approval</Badge>
            <h1 className="text-3xl font-extrabold text-amber-950">
              Thanks, {firstName} — you&apos;re on the list
            </h1>
            <p className="text-amber-900/80">
              <strong className="text-amber-950">{challenge.title}</strong> is approved by its
              organiser before you can start. We&apos;ll email you as soon as your place is
              confirmed{startDate && <> — the challenge begins <strong className="text-amber-950">{startDate}</strong></>}.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground text-center space-y-3">
            <Badge className="bg-white/20 text-white">You&apos;re in!</Badge>
            <h1 className="text-3xl font-extrabold">
              Welcome, {firstName}! 🎉
            </h1>
            <p className="text-primary-foreground/90">
              You&apos;re registered for{' '}
              <strong className="text-white">{challenge.title}</strong>.
              {startDate && <><br />Challenge starts <strong className="text-white">{startDate}</strong>.</>}
            </p>
          </div>
        )}

        {/* Setup checklist */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Get ready</h2>
            <Badge variant="secondary">{setupDone}/{setupItems.length} done</Badge>
          </div>
          <Progress value={setupPct} className="h-1.5" aria-label={`Setup ${setupPct}% complete`} />
          <div className="space-y-3">
            {setupItems.map((item) => (
              <div key={item.label} className={`flex items-center gap-3 rounded-lg border p-3 ${
                item.done ? 'border-green-200 bg-green-50' : 'border-border bg-card'
              }`}>
                <CheckCircle className={`h-4 w-4 shrink-0 ${item.done ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${item.done ? 'text-green-700' : 'text-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Challenge schedule */}
        {challenge.steps.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-bold text-foreground">Your schedule</h2>
            <div className="space-y-2">
              {challenge.steps.map((step, i) => {
                const unlockDate = challenge.startsAt
                  ? new Date(new Date(challenge.startsAt).getTime() + i * 86400000)
                  : null
                return (
                  <div key={step.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
                    </div>
                    {unlockDate && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {unlockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="flex-1 gap-2">
            <Link href={`/c/${challengeSlug}/hub`}>
              Go to challenge hub <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

      </main>
    </div>
  )
}
