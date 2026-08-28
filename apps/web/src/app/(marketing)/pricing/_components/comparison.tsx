/**
 * The full feature comparison.
 *
 * Reads from the same COMPARISON data the cards read their highlights from,
 * so the table and the cards cannot drift apart — a comparison row that
 * contradicts the card above it is the classic pricing-page bug.
 *
 * Two renderings, because one does not work at both sizes:
 *
 *   **Table**, from `md` up. Four columns need the width, and the first
 *   column stays put while the rest scroll, so a row of ticks never loses its
 *   label.
 *
 *   **Stacked cards**, below `md`. A four-column table on a phone is a
 *   horizontal scroller that nobody scrolls, and the sticky first column that
 *   would rescue it leaks out of its container in Chrome and drags the whole
 *   page sideways. One plan at a time reads better than either.
 */

import { Check, Minus } from 'lucide-react'
import { COMPARISON, PLANS, type Cell } from './plans'
import { cn } from '@/lib/utils'

function CellValue({ value, label }: { value: Cell; label: string }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
        <span className="sr-only">{`${label}: included`}</span>
      </>
    )
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
        <span className="sr-only">{`${label}: not included`}</span>
      </>
    )
  }
  return <span className="text-[13px] font-medium text-foreground">{value}</span>
}

export function Comparison() {
  return (
    <>
      <ComparisonTable />
      <ComparisonStack />
    </>
  )
}

// ─── md and up ───────────────────────────────────────────────────────────────

function ComparisonTable() {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card md:block">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          Feature comparison across the Starter, Professional and Business plans
        </caption>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-b border-border bg-card px-5 py-4 text-sm font-semibold text-foreground"
            >
              Everything included
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                className={cn(
                  'w-[150px] border-b border-border px-4 py-4 text-center text-sm font-semibold',
                  plan.recommended ? 'bg-primary/[0.04] text-primary' : 'text-foreground'
                )}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>

        {COMPARISON.map((section) => (
          <tbody key={section.group}>
            <tr>
              <th
                scope="colgroup"
                colSpan={PLANS.length + 1}
                className="bg-muted/40 px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {section.group}
              </th>
            </tr>

            {section.rows.map((row) => (
              <tr key={row.label}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-t border-border/60 bg-card px-5 py-3 text-left align-top font-normal"
                >
                  <span className="block text-[13px] leading-snug text-foreground">{row.label}</span>
                  {row.note && (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{row.note}</span>
                  )}
                </th>
                {PLANS.map((plan) => (
                  <td
                    key={plan.id}
                    className={cn(
                      'border-t border-border/60 px-4 py-3 text-center align-middle',
                      plan.recommended && 'bg-primary/[0.04]'
                    )}
                  >
                    <CellValue value={row[plan.id]} label={`${plan.name}, ${row.label}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

// ─── below md ────────────────────────────────────────────────────────────────

function ComparisonStack() {
  return (
    <div className="space-y-5 md:hidden">
      {PLANS.map((plan) => (
        <section
          key={plan.id}
          aria-label={`${plan.name} plan, in full`}
          className={cn(
            'overflow-hidden rounded-2xl border bg-card',
            plan.recommended ? 'border-primary/40' : 'border-border/70'
          )}
        >
          <header
            className={cn(
              'flex items-center gap-2 border-b px-5 py-3.5',
              plan.recommended ? 'border-primary/20 bg-primary/[0.05]' : 'border-border bg-muted/30'
            )}
          >
            <h3 className={cn(
              'text-sm font-bold tracking-tight',
              plan.recommended ? 'text-primary' : 'text-foreground'
            )}>
              {plan.name}
            </h3>
            {plan.recommended && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
          </header>

          {COMPARISON.map((section) => (
            <div key={section.group}>
              <p className="bg-muted/40 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.group}
              </p>
              <dl>
                {section.rows.map((row) => {
                  const value = row[plan.id]
                  return (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4 border-t border-border/60 px-5 py-2.5"
                    >
                      <dt className="min-w-0">
                        <span className="block text-[13px] leading-snug text-foreground">{row.label}</span>
                        {row.note && (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">{row.note}</span>
                        )}
                      </dt>
                      <dd className="shrink-0 pt-0.5 text-right">
                        {value === true && (
                          <>
                            <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span className="sr-only">Included</span>
                          </>
                        )}
                        {value === false && (
                          <>
                            <Minus className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
                            <span className="sr-only">Not included</span>
                          </>
                        )}
                        {typeof value === 'string' && (
                          <span className="text-[13px] font-medium text-foreground">{value}</span>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
