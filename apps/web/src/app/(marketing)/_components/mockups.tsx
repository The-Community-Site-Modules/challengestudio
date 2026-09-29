/**
 * Product mockups for the marketing homepage.
 *
 * These are hand-built markup, not screenshots. Three reasons: a screenshot
 * goes stale the moment the UI moves, it cannot be read by a screen reader,
 * and it ships as a large image on the one page where speed matters most.
 * Built in markup, each mockup stays sharp at any width and weighs nothing.
 *
 * They are illustrations of a real product, so the numbers are internally
 * consistent — the day-by-day curve in the hero, the retention chart further
 * down and the "12 quiet" count all describe the same imaginary challenge.
 * Nothing here claims to be a real customer's data, and no real person is
 * named. If you change a figure in one place, change it in `CHALLENGE` below
 * rather than in the markup, or the page starts contradicting itself.
 *
 * All decorative: `aria-hidden` is applied by the section that renders them,
 * which carries the real description in text.
 */

import { CheckCircle2, Flame, FileText, Play, Lock, Users, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── The one imaginary challenge every mockup describes ──────────────────────

const CHALLENGE = {
  title: '5-Day Momentum Challenge',
  registered: 247,
  activatedPct: 76,
  quiet: 12,
  /** Completion per day. The Day 3 dip is the point the analytics copy makes. */
  days: [
    { label: 'Orientation', short: 'Orient.', pct: 94 },
    { label: 'Day 1',       short: 'Day 1',   pct: 86 },
    { label: 'Day 2',       short: 'Day 2',   pct: 79 },
    { label: 'Day 3',       short: 'Day 3',   pct: 61 },
  ],
} as const

// ─── Hero: creator's view, with the participant's phone over it ──────────────

/** The creator's overview, trimmed to what reads at hero size. */
function CreatorCard() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xl shadow-primary/10 ring-1 ring-black/[0.03]">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Creator view
      </p>
      <p className="mt-1 text-[15px] font-bold tracking-tight text-foreground">
        {CHALLENGE.title}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { value: String(CHALLENGE.registered), label: 'Registered' },
          { value: `${CHALLENGE.activatedPct}%`, label: 'Activated' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="text-[22px] font-bold leading-none tracking-tight text-foreground tabular-nums">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-medium text-foreground">Day-by-day completion</p>
      <div className="mt-2.5 space-y-2">
        {CHALLENGE.days.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2.5">
            <span className="w-[72px] shrink-0 text-[10px] text-muted-foreground">
              {i === CHALLENGE.days.length - 1 ? `${d.label} · today` : d.label}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  'block h-full origin-left rounded-full bg-primary animate-grow-bar',
                  ['delay-1', 'delay-2', 'delay-3', 'delay-4'][i]
                )}
                style={{ width: `${d.pct}%` }}
              />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2">
        <Users className="h-3.5 w-3.5 shrink-0 text-amber-700" />
        <p className="text-[11px] font-medium text-amber-900">
          {CHALLENGE.quiet} people quiet for 2+ days
        </p>
      </div>
    </div>
  )
}

/** The participant's side of the same day, on the device they actually use. */
function PhoneCard() {
  const steps = [
    { title: 'Watch: the offer stack', sub: 'About 6 minutes', state: 'done' },
    { title: 'Write your offer',       sub: 'Required · next up', state: 'next' },
    { title: 'Private reflection',     sub: 'Only you see this', state: 'todo' },
    { title: 'Share with the group',   sub: '14 people posted today', state: 'todo' },
  ] as const

  return (
    <div className="w-[228px] overflow-hidden rounded-[1.75rem] border-[6px] border-foreground/85 bg-card shadow-2xl">
      <div className="bg-primary px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-primary-foreground/80">
            Day 3 of 5
          </span>
          <span className="flex items-center gap-1 text-[9px] font-semibold text-primary-foreground/90">
            <Flame className="h-2.5 w-2.5" /> 5-day streak
          </span>
        </div>
        <p className="mt-2.5 text-[17px] font-bold leading-tight tracking-tight text-primary-foreground">
          Craft your offer
        </p>
        <p className="mt-1 text-[10px] text-primary-foreground/80">About 20 minutes</p>
      </div>

      <div className="space-y-1.5 p-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border p-2.5',
              s.state === 'next'
                ? 'border-primary/40 bg-primary/[0.05]'
                : 'border-border/70 bg-background'
            )}
          >
            {s.state === 'done' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <span
                className={cn(
                  'h-4 w-4 shrink-0 rounded-full border-2',
                  s.state === 'next' ? 'border-primary' : 'border-border'
                )}
              />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-[11px] font-medium',
                  s.state === 'done'
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                )}
              >
                {s.title}
              </p>
              <p
                className={cn(
                  'truncate text-[9px]',
                  s.state === 'next' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {s.sub}
              </p>
            </div>
          </div>
        ))}

        <div className="mt-2 rounded-xl bg-primary py-2.5 text-center text-[11px] font-semibold text-primary-foreground">
          Continue: Write your offer
        </div>
      </div>
    </div>
  )
}

/** A moment worth marking, floated over the pair. */
function BadgeChip() {
  return (
    <div className="w-[190px] rounded-xl border border-border/80 bg-card/95 p-3 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base">
          🏆
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
            Halfway there
          </p>
          <p className="text-[10px] text-muted-foreground">Badge earned · +250 XP</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Both sides of the product in one image: what the creator watches, and what
 * the participant actually opens. The phone overlaps deliberately — the two
 * views are the same challenge, not two products.
 *
 * Below `lg` the phone and badge are dropped rather than stacked. At that
 * width an overlapped composition becomes a pile, and the creator card alone
 * still says what the hero needs to say.
 */
export function HeroShowcase() {
  return (
    <div className="relative">
      <div className="lg:max-w-[420px]">
        <CreatorCard />
      </div>

      <div className="absolute -right-2 -top-8 hidden lg:block xl:-right-10">
        <PhoneCard />
      </div>

      <div
        className="absolute -bottom-7 left-2 hidden animate-float lg:block"
        style={{ animationDelay: '0.8s' }}
      >
        <BadgeChip />
      </div>
    </div>
  )
}

// ─── Feature grid: the day builder ───────────────────────────────────────────

/** What building one day looks like: blocks, in order, some of them required. */
export function DayBuilderMockup() {
  const blocks = [
    { label: 'Video',      sub: 'The offer stack · 6 min', required: false },
    { label: 'Assignment', sub: 'Write your offer',        required: true },
    { label: 'Reflection', sub: 'What felt hardest?',      required: true },
  ]

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-lg shadow-primary/5">
      <p className="text-[12px] font-semibold text-foreground">Day 3 — Craft your offer</p>

      <div className="mt-3 space-y-2">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background p-2.5"
          >
            <span className="flex h-4 w-4 shrink-0 flex-col justify-center gap-[3px]">
              {[0, 1, 2].map((n) => (
                <span key={n} className="h-[2px] w-3 rounded-full bg-border" />
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground">{b.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">{b.sub}</p>
            </div>
            {b.required && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                Required
              </span>
            )}
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-border p-2.5 text-center text-[11px] text-muted-foreground">
          + Add block
        </div>
      </div>
    </div>
  )
}

// ─── Analytics: who is still with you ────────────────────────────────────────

/**
 * The retention curve, as a column chart.
 *
 * The Day 3 column is orange and Day 4 is an empty outline: the drop is the
 * subject of the section, and Day 4 has not happened yet. Showing an unreached
 * day as zero would be a lie of exactly the kind the copy beside it disavows.
 */
export function RetentionMockup() {
  const columns = [
    ...CHALLENGE.days.map((d, i) => ({
      label: d.short,
      pct: d.pct,
      tone: i === CHALLENGE.days.length - 1 ? ('drop' as const) : ('normal' as const),
    })),
    { label: 'Day 4', pct: 0, tone: 'pending' as const },
  ]

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-primary/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground">Who is still with you</p>
        <p className="text-[11px] text-muted-foreground">
          5-Day Momentum · {CHALLENGE.registered} registered
        </p>
      </div>

      <div className="mt-6 flex h-40 items-end gap-2.5">
        {columns.map((c, i) => (
          <div key={c.label} className="flex h-full flex-1 flex-col justify-end">
            {c.tone === 'pending' ? (
              <div className="h-1/2 rounded-t-md border-2 border-dashed border-border/80" />
            ) : (
              <>
                <p className="mb-1.5 text-center text-[11px] font-semibold tabular-nums text-foreground">
                  {c.pct}%
                </p>
                <div
                  className={cn(
                    'origin-bottom rounded-t-md animate-grow-col',
                    c.tone === 'drop' ? 'bg-orange-500' : 'bg-primary',
                    ['delay-1', 'delay-2', 'delay-3', 'delay-4'][i]
                  )}
                  style={{ height: `${c.pct}%` }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2.5">
        {columns.map((c) => (
          <p key={c.label} className="flex-1 text-center text-[10px] text-muted-foreground">
            {c.label}
          </p>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
        <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-900">
          Biggest drop: Day 2 → Day 3 (−18 pts)
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {CHALLENGE.quiet} at risk
        </span>
      </div>
    </div>
  )
}

// ─── Feature grid: the community feed ────────────────────────────────────────

/** A post beside the work it is about, rather than a tab away in a group. */
export function FeedMockup() {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          AL
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-tight text-foreground">A participant</p>
          <p className="text-[9px] text-muted-foreground">Day 3 · 20 minutes ago</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Rewrote my offer three times and the third one finally sounds like a person.
      </p>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">❤️ 12</span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> 4
        </span>
      </div>
    </div>
  )
}

// ─── Feature grid: unlock timing ─────────────────────────────────────────────

/** Yesterday done, today open, tomorrow locked — the whole timing model. */
export function UnlockMockup() {
  const days = [
    { label: 'Day 1', state: 'done' },
    { label: 'Day 2', state: 'open' },
    { label: 'Day 3', state: 'locked' },
  ] as const

  return (
    <div className="flex flex-wrap gap-2">
      {days.map((d) => (
        <span
          key={d.label}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
            d.state === 'done' && 'border-green-200 bg-green-50 text-green-800',
            d.state === 'open' && 'border-primary/40 bg-primary/10 text-primary',
            d.state === 'locked' && 'border-border/70 bg-muted/40 text-muted-foreground'
          )}
        >
          {d.state === 'done' && <CheckCircle2 className="h-3 w-3" />}
          {d.state === 'locked' && <Lock className="h-3 w-3" />}
          {d.state === 'open' && <Play className="h-3 w-3" />}
          {d.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <FileText className="h-3 w-3" /> 8:00 AM, their time
      </span>
    </div>
  )
}
