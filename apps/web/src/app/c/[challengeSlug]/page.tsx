import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, Calendar, Clock, Users,
  ArrowRight, Zap,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { db }        from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { registerAction } from './actions'

interface Props {
  params:       Promise<{ challengeSlug: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function RegistrationPage({ params, searchParams }: Props) {
  const { challengeSlug }  = await params
  const { error }          = await searchParams
  const currentUser        = await getCurrentUser()

  // Load real challenge from DB
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, slug: true, title: true, description: true,
      promise: true, outcome: true, mode: true, status: true,
      startsAt: true, endsAt: true, timezone: true,
      registrationOpensAt: true, registrationClosesAt: true,
      maxParticipants: true, isPublic: true, requiresApproval: true,
      settings: true,
      workspace: { select: { name: true, logoUrl: true } },
      steps: {
        orderBy: { order: 'asc' },
        select: { title: true, stepType: true, estimatedMinutes: true },
      },
      _count: { select: { participants: true } },
    },
  })

  if (!challenge || !['PUBLISHED', 'ACTIVE'].includes(challenge.status as string)) {
    notFound()
  }

  // Check if current user is already enrolled
  let alreadyEnrolled = false
  if (currentUser) {
    const participant = await db.participant.findUnique({
      where: { challengeId_profileId: { challengeId: challenge.id, profileId: currentUser.id } },
      select: { id: true },
    })
    alreadyEnrolled = !!participant
  }

  // A private challenge has no public registration page. isPublic was selected
  // here but never read, so "private" was a setting that did nothing: the page
  // rendered and the form took registrations from anyone with the link.
  //
  // Already-enrolled participants still need this URL — it is where their
  // "continue" link points. Everyone else gets nothing to see, which matches
  // what registerAction now refuses.
  if (!challenge.isPublic && !alreadyEnrolled) {
    notFound()
  }

  const startDate = challenge.startsAt
    ? challenge.startsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Coming soon'

  const registrationOpen = (() => {
    const now = new Date()
    if (challenge.registrationOpensAt  && challenge.registrationOpensAt > now)  return false
    if (challenge.registrationClosesAt && challenge.registrationClosesAt < now) return false
    if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants) return false
    return true
  })()

  const settings = (challenge.settings as Record<string, unknown>) ?? {}
  const numDays  = (settings.numDays as string) ?? challenge.steps.length.toString()

  // Bound server action with slug
  async function handleRegister(formData: FormData) {
    'use server'
    await registerAction(challengeSlug, formData)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Branded header — overrides layout nav on this page */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            {challenge.workspace.logoUrl ? (
              <img src={challenge.workspace.logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-foreground">{challenge.workspace.name}</span>
          </div>
          {alreadyEnrolled ? (
            <Button size="sm" asChild>
              <Link href={`/c/${challengeSlug}/hub`}>Go to hub →</Link>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <a href="#register">Register now — it&apos;s free</a>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">

          {/* ── Left column ──────────────────────────────────── */}
          <div className="space-y-12">

            {/* Hero */}
            <section>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {challenge.startsAt && challenge.startsAt > new Date() && (
                  <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                    <Clock className="h-3 w-3" />
                    Starts {startDate}
                  </div>
                )}
                <Badge variant="secondary">{numDays} days</Badge>
                <Badge variant="secondary">Free</Badge>
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
                {challenge.title}
              </h1>
              {(challenge.promise ?? challenge.description) && (
                <p className="mt-4 text-xl text-muted-foreground">
                  {challenge.promise ?? challenge.description}
                </p>
              )}

              {/* Quick facts */}
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
                {challenge.startsAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{startDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>30–45 min/day</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{challenge._count.participants} registered</span>
                </div>
              </div>
            </section>

            {/* What you'll get */}
            {challenge.outcome && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">What you&apos;ll achieve</h2>
                <p className="text-muted-foreground">{challenge.outcome}</p>
              </section>
            )}

            {/* Agenda from real steps */}
            {challenge.steps.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">{numDays}-day agenda</h2>
                <div className="space-y-3">
                  {challenge.steps.map((step, i) => (
                    <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{step.title}</p>
                        {step.estimatedMinutes && (
                          <p className="text-xs text-muted-foreground">{step.estimatedMinutes} min</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ── Right column — registration form ─────────────── */}
          <div className="lg:sticky lg:top-20 lg:self-start" id="register">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="text-center mb-6">
                {alreadyEnrolled ? (
                  <>
                    <Badge variant="success" className="mb-3">You&apos;re enrolled! ✓</Badge>
                    <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You&apos;re already registered for this challenge.
                    </p>
                    <Button asChild className="mt-4 w-full gap-2">
                      <Link href={`/c/${challengeSlug}/hub`}>
                        Go to challenge hub <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="success" className="mb-3">Free — No credit card</Badge>
                    <h2 className="text-xl font-bold text-foreground">Reserve your spot</h2>
                    {challenge.startsAt && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Starts <strong>{startDate}</strong>
                      </p>
                    )}

                    {/* Social proof */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="flex -space-x-2">
                        {['AK', 'MJ', 'PR', 'TL'].map((init) => (
                          <div key={init} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-bold text-primary-foreground">
                            {init}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {challenge._count.participants} people registered
                      </span>
                    </div>
                  </>
                )}
              </div>

              {!alreadyEnrolled && (
                <>
                  <Separator className="mb-6" />

                  {error && (
                    <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {decodeURIComponent(error)}
                    </div>
                  )}

                  {registrationOpen ? (
                    <form action={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName">First name</Label>
                          <Input id="firstName" name="firstName" placeholder="Jane" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName">Last name</Label>
                          <Input id="lastName" name="lastName" placeholder="Smith" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        By registering you agree to our{' '}
                        <Link href="/legal/terms" className="underline hover:text-foreground">Terms</Link>
                        {' '}and{' '}
                        <Link href="/legal/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                      </p>
                      <Button type="submit" size="lg" className="w-full gap-2">
                        Register for free <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                      {challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants
                        ? 'This challenge is full.'
                        : 'Registration is currently closed.'}
                    </div>
                  )}

                  <div className="mt-5 space-y-2">
                    {['100% free — no credit card', 'Magic link login — no password needed', 'Unsubscribe anytime'].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
