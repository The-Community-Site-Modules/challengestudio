// Route: /auth/signup
//
// A split screen: the form on the left, and on the right a panel that answers
// "what am I signing up for" without asking anyone to read a marketing page.
//
// The right panel is hidden below `lg`. On a phone it would push the form
// below the fold, and the form is the only thing on this page anybody came
// for. It is not a smaller version of the panel — it is no panel.
//
// This page does not use `AuthShell` like the other auth pages, which is why
// the shell moved out of the layout in the first place.

import Link from 'next/link'
import { Suspense } from 'react'
import { Check, Flame, Trophy, Users, Lock } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { SignupForm } from './_components/signup-form'

export const metadata = {
  title: 'Create your account — Challenge Studio',
  description: 'Start building your first challenge. Free during beta, no credit card.',
}

const INCLUDED = [
  'Unlimited challenges while in beta',
  'The whole builder — every content block',
  'Community, points, streaks and badges',
  'Automated email and full analytics',
]

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="flex w-full flex-col bg-background lg:w-[54%]">
        <header className="flex h-16 shrink-0 items-center px-6 sm:px-10">
          <Link href="/" className="flex items-center" aria-label="Challenge Studio home">
            <Logo variant="lockup" className="h-7" priority />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              Free while Challenge Studio is in beta. No card, and nothing goes
              live until you publish it.
            </p>

            <div className="mt-7">
              {/* useSearchParams needs a boundary, or the whole route opts out
                  of static rendering. */}
              <Suspense fallback={<div className="h-[560px]" aria-hidden="true" />}>
                <SignupForm />
              </Suspense>
            </div>
          </div>
        </div>

        <footer className="shrink-0 px-6 py-5 text-center text-xs text-muted-foreground sm:px-10">
          <Link href="/legal/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/legal/terms" className="hover:text-foreground hover:underline">Terms</Link>
        </footer>
      </div>

      {/* ── Brand panel ──────────────────────────────────────────────────── */}
      <aside
        aria-label="What Challenge Studio includes"
        className="relative hidden overflow-hidden border-l border-border/60 bg-mesh lg:flex lg:w-[46%] lg:flex-col lg:justify-center"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />

        <div className="relative px-12 py-16 xl:px-16">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            What you get
          </p>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.15] tracking-tight text-foreground xl:text-[34px]">
            Everything a challenge needs,{' '}
            <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
              from the first day
            </span>
          </h2>

          <ul className="mt-8 space-y-3.5">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="text-[15px] leading-relaxed text-foreground">{item}</span>
              </li>
            ))}
          </ul>

          {/* A glimpse of the thing itself, rather than a stock photograph. */}
          <div
            aria-hidden="true"
            className="mt-10 rounded-2xl border border-border/80 bg-card/90 p-5 shadow-xl shadow-primary/5 backdrop-blur"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight text-foreground">
                  5-Day Momentum Challenge
                </p>
                <p className="text-[11px] text-muted-foreground">247 registered · Day 4 of 5</p>
              </div>
              <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                live
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Orientation', pct: 94 },
                { label: 'Day 1 — Your Big Idea', pct: 88 },
                { label: 'Day 2 — Know Your Buyer', pct: 79 },
              ].map((d, i) => (
                <div key={d.label} className="flex items-center gap-2.5">
                  <span className="w-32 shrink-0 truncate text-[11px] text-muted-foreground">
                    {d.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cnDelay(i)}
                      style={{ width: `${d.pct}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-foreground">
                    {d.pct}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-900">
                <Flame className="h-3 w-3" /> 88 on a streak
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                <Trophy className="h-3 w-3" /> 3 badges today
              </span>
            </div>
          </div>

          <p className="mt-8 flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Participants’ private reflections stay private — withheld on the
            server, not hidden in the page.
          </p>
        </div>
      </aside>
    </div>
  )
}

/** The three bars grow in sequence rather than all at once. */
function cnDelay(index: number): string {
  const delay = ['delay-1', 'delay-2', 'delay-3'][index] ?? ''
  return `block h-full origin-left rounded-full bg-primary animate-grow-bar ${delay}`
}
