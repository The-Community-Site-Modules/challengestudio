// Route: /pricing
//
// Pricing is genuinely undecided — PRD OD-11 is still open, and §19.2 defers
// billing out of the MVP entirely. There is no payment processor wired up and
// no plan to charge against.
//
// So this page says that, rather than inventing three tiers with prices
// nobody has agreed to. A made-up price is worse than an absent one: it is a
// promise to whoever reads it, and the first support conversation after
// launch would be about why the number changed.
//
// When OD-11 closes, replace the middle section with the real plans. The rest
// of the page — what beta includes, and the questions — stays true either way.

import Link from 'next/link'
import { ArrowRight, Check, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Pricing — Challenge Studio',
  description:
    'Challenge Studio is in beta and free to use while we get it right. Pricing is being decided with the people using it.',
}

const included = [
  'Unlimited challenges, of any length',
  'Unlimited participants',
  'The full builder — every content block',
  'Community feed, comments and reactions',
  'Points, streaks and badges',
  'Automated email for every trigger',
  'Live sessions, replays and calendar links',
  'A post-challenge offer page',
  'Analytics, per-participant reporting and CSV export',
  'Multiple workspaces, with a team in each',
]

const questions = [
  {
    q: 'Is it really free?',
    a: 'While it is in beta, yes — everything above, with no card and no trial clock. It is free because it is early, not as a promotion.',
  },
  {
    q: 'What happens when pricing arrives?',
    a: 'You will hear it from us before anything changes, and you will keep what you have built. Nobody in the beta will find a paywall in front of their own challenges.',
  },
  {
    q: 'Will there be a free plan afterwards?',
    a: 'That is one of the things still being decided. It is a fair question to put to us now, while the answer can still be influenced.',
  },
  {
    q: 'Can I take my data with me?',
    a: 'Yes. Participants and their progress export as CSV from any challenge, whenever you want.',
  },
  {
    q: 'Do you take a cut of what I charge?',
    a: 'No. Challenge Studio does not process payments at all — a paid challenge checks an entitlement you grant elsewhere, and the money never passes through here.',
  },
]

export default function PricingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            In beta
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Free while we{' '}
            <span className="text-primary">get it right</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            We have not set prices yet, and we would rather say so than put three
            invented tiers on a page. Everything is open during the beta, and
            what it costs afterwards is being worked out with the people
            actually running challenges on it.
          </p>
        </div>
      </section>

      {/* What beta includes */}
      <section className="pb-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Everything, included
              </h2>
              <p className="text-sm text-muted-foreground">No card. No trial countdown.</p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/auth/signup">
                  Start building free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/features">See what is included</Link>
              </Button>
            </div>
          </div>

          {/* Have a say */}
          <div className="mt-6 flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Running something big?</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                If you are planning a challenge with thousands of participants, or
                running them for clients, tell us before you start. Those are the
                cases pricing has to work for, and we would rather hear about
                yours while it can still shape the answer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Fair questions
          </h2>
          <dl className="mt-8 divide-y divide-border">
            {questions.map(({ q, a }) => (
              <div key={q} className="py-5">
                <dt className="font-semibold text-foreground">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  )
}
