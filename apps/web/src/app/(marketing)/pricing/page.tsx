// Route: /pricing
//
// A marketing pricing page, built ahead of the billing it describes.
//
// Native billing is deliberately excluded from the MVP and OD-11 — what the
// plans actually cost — is still an open decision. Two consequences are
// deliberate, not oversights:
//
//   1. Nothing here reaches a checkout. Every call to action goes to sign-up,
//      because there is no payment provider wired up and no plan record to
//      buy. Building a checkout screen now would be scaffolding the one thing
//      the plan says not to scaffold.
//
//   2. A banner at the top says the beta is free and these prices are not
//      live yet. The page would otherwise be a promise to every visitor, and
//      the first support conversation after launch would be about why the
//      number changed.
//
// The numbers themselves live in _components/plans.ts. When they are decided,
// that one file updates the cards and the comparison table together.

import Link from 'next/link'
import { ArrowRight, Info, ShieldCheck, Download, Users, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanCards } from './_components/plan-cards'
import { Comparison } from './_components/comparison'

export const metadata = {
  title: 'Pricing — Challenge Studio',
  description:
    'Starter, Professional and Business plans. Challenge limits, participant limits, team members, analytics, branding and support compared.',
}

const REASSURANCE = [
  { icon: <Repeat className="h-4 w-4" />,      title: 'Change plan any time',   body: 'Up or down, from inside your workspace. Nothing is locked for a year.' },
  { icon: <Users className="h-4 w-4" />,       title: 'Participants are not seats', body: 'You are charged for the team running challenges, never for the people taking them.' },
  { icon: <Download className="h-4 w-4" />,    title: 'Your data leaves with you', body: 'Participants and progress export as CSV whenever you want.' },
  { icon: <ShieldCheck className="h-4 w-4" />, title: 'No cut of your sales',   body: 'Challenge Studio never processes payments. A paid challenge checks an entitlement you grant elsewhere.' },
]

const FAQ = [
  {
    q: 'What counts as an active challenge?',
    a: 'One that is published and accepting participants. Drafts are unlimited on every plan, and a challenge that has finished stops counting the moment you close it.',
  },
  {
    q: 'What happens if a challenge outgrows its participant limit?',
    a: 'Registration pauses at the limit rather than silently turning people away — you are told, and you can move up a plan and reopen it. Nobody already enrolled is ever locked out.',
  },
  {
    q: 'Do team members need their own plan?',
    a: 'No. Team members are included in your workspace at the number shown, and they inherit the plan’s features. Their role decides what they can see.',
  },
  {
    q: 'Can I run more than one brand?',
    a: 'Business includes five workspaces, each with its own branding, team and challenges. Starter and Professional include one.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Everything is free during the beta. Whether a free tier survives beyond it is one of the things still being decided, and it is a fair question to put to us now while the answer can still be influenced.',
  },
  {
    q: 'What if I need more than Business?',
    a: 'Tell us what you are running. Challenges with tens of thousands of participants are exactly the case pricing has to work for, and we would rather hear about yours early.',
  },
]

export default function PricingPage() {
  return (
    <main>
      {/* Beta banner — the page describes billing that is not switched on. */}
      <div className="border-b border-primary/20 bg-primary/[0.06]">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-6 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-foreground">
            <span className="font-semibold">Challenge Studio is in beta and free to use.</span>{' '}
            These plans are what pricing will look like — nothing is charged yet, and
            beta accounts will hear from us well before anything changes.
          </p>
        </div>
      </div>

      {/* Hero + cards */}
      <section className="relative overflow-hidden bg-mesh">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-[0.3]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-14 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="animate-fade-up text-[40px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[54px]">
              Priced for the{' '}
              <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                challenges you run
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl animate-fade-up delay-1 text-lg leading-relaxed text-muted-foreground">
              Not for how many people take part. Every plan includes the whole
              product — the builder, the community, the emails and the analytics.
            </p>
          </div>

          <div className="mt-11 animate-fade-up delay-2">
            <PlanCards />
          </div>
        </div>
      </section>

      {/* Reassurance strip */}
      <section className="border-y border-border/60 bg-muted/25 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASSURANCE.map((r) => (
              <div key={r.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {r.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Compare the plans
            </h2>
            <p className="mt-4 text-muted-foreground">
              The differences are limits and reporting depth. Nothing that makes a
              challenge work is held back from the smallest plan.
            </p>
          </div>

          <div className="mt-12">
            <Comparison />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 bg-muted/25 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Questions worth asking
          </h2>
          <dl className="mt-8 divide-y divide-border">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="font-semibold text-foreground">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(60% 60% at 20% 0%, rgba(255,255,255,0.25) 0%, transparent 60%), radial-gradient(50% 50% at 80% 100%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Start on the free beta
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/90">
            Build a challenge, run it properly, and decide about a plan when there
            is one to decide about.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
              <Link href="/auth/signup">
                Create a Challenge <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto"
              asChild
            >
              <Link href="/features">See what is included</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
