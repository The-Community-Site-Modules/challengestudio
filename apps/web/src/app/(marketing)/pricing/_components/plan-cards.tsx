'use client'

/**
 * The three plan cards and the billing-period toggle.
 *
 * Client-side only because the toggle changes the prices; nothing here talks
 * to a payment provider, and there is no checkout to reach. Every call to
 * action goes to sign-up, because native billing is deliberately out of the
 * MVP — see the note at the top of plans.ts.
 *
 * The toggle is a radiogroup rather than a switch. A switch says "on or off",
 * which is not the choice being made, and a screen reader would announce the
 * yearly option as a state rather than as one of two prices.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PLANS, YEARLY_MONTHS_PAID, type Plan } from './plans'

type Period = 'monthly' | 'yearly'

const SAVING_PERCENT = Math.round((1 - YEARLY_MONTHS_PAID / 12) * 100)

export function PlanCards() {
  const [period, setPeriod] = useState<Period>('yearly')

  return (
    <>
      {/* Billing period */}
      <div
        role="radiogroup"
        aria-label="Billing period"
        className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-muted/50 p-1"
      >
        {(['monthly', 'yearly'] as const).map((value) => {
          const selected = period === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPeriod(value)}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {value === 'monthly' ? 'Monthly' : 'Yearly'}
              {value === 'yearly' && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  Save {SAVING_PERCENT}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} period={period} />
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Prices in USD.{' '}
        {period === 'yearly'
          ? `Yearly plans are billed once a year — ${YEARLY_MONTHS_PAID} months for 12.`
          : 'Switch to yearly to pay for ten months instead of twelve.'}
      </p>
    </>
  )
}

function PlanCard({ plan, period }: { plan: Plan; period: Period }) {
  const price = period === 'yearly' ? plan.yearlyMonthly : plan.monthly
  const recommended = plan.recommended === true

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-7',
        recommended
          ? 'border-primary/40 shadow-2xl shadow-primary/10 lg:-my-4 lg:p-8'
          : 'border-border/70 shadow-sm'
      )}
    >
      {recommended && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-primary to-violet-500"
          />
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow">
            <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Most popular
          </span>
        </>
      )}

      <div className={cn(recommended && 'pt-2')}>
        <h3 className="text-lg font-bold tracking-tight text-foreground">{plan.name}</h3>
        <p className="mt-1.5 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
          {plan.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-[15px] font-medium text-muted-foreground">$</span>
        <span className="text-[44px] font-extrabold leading-none tracking-tight text-foreground tabular-nums">
          {price}
        </span>
        <span className="text-sm text-muted-foreground">/ month</span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        {period === 'yearly'
          ? `Billed $${price * 12} once a year`
          : 'Billed monthly, cancel any time'}
      </p>

      {/* CTA — sign-up, never a checkout. */}
      <Button
        className="mt-6 h-11 w-full text-[15px]"
        variant={recommended ? 'default' : 'outline'}
        asChild
      >
        <Link href="/auth/signup">
          {plan.cta}
          {recommended && <ArrowRight className="ml-2 h-4 w-4" />}
        </Link>
      </Button>

      {/* Headline limits */}
      <ul className="mt-7 space-y-3 border-t border-border pt-6">
        {plan.highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
