/**
 * Product mockups for the marketing homepage.
 *
 * These are hand-built markup, not screenshots. Three reasons: a screenshot
 * goes stale the moment the UI moves, it cannot be read by a screen reader,
 * and it ships as a large image on the one page where speed matters most.
 * Built in markup, each mockup stays sharp at any width and weighs nothing.
 *
 * They are illustrations of a real product, so the numbers are internally
 * consistent — the day-by-day curve, the completion rate and the participant
 * count in the hero all describe the same imaginary challenge. Nothing here
 * claims to be a real customer's data, and no real person is named.
 *
 * All decorative: `aria-hidden` on each, with the surrounding section
 * carrying the actual description in text.
 */

import {
  BarChart3, Users, Zap, CheckCircle2, Flame, Trophy, Lock, Play,
  MessageSquare, FileText, Radio, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Shared chrome ───────────────────────────────────────────────────────────

/** A browser-ish window frame, so a mockup reads as a screen and not a card. */
function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-primary/5 ring-1 ring-black/[0.03]',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 hidden rounded-md bg-background/70 px-2.5 py-0.5 text-[11px] text-muted-foreground sm:block">
          challengestudio.app/ws/momentum/overview
        </span>
      </div>
      {children}
    </div>
  )
}

function Stat({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-3.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-2.5 text-[19px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-foreground">{label}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{sub}</p>
    </div>
  )
}

// One imaginary challenge, described consistently everywhere below.
const DAYS = [
  { label: 'Orientation',    pct: 94 },
  { label: 'Day 1 — Big Idea', pct: 88 },
  { label: 'Day 2 — Your Buyer', pct: 79 },
  { label: 'Day 3 — The Offer',  pct: 61 },
  { label: 'Day 4 — Outreach',   pct: 42 },
]

// ─── Hero: the creator's dashboard ───────────────────────────────────────────

export function DashboardMockup() {
  return (
    <Frame>
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-44 shrink-0 border-r border-border/70 bg-muted/25 p-3 sm:block">
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              M
            </span>
            <span className="text-[11px] font-semibold text-foreground">Momentum Co.</span>
          </div>
          <nav className="mt-4 space-y-0.5">
            {[
              { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Overview', active: true },
              { icon: <FileText className="h-3.5 w-3.5" />,  label: 'Builder' },
              { icon: <Users className="h-3.5 w-3.5" />,     label: 'Participants' },
              { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Community' },
              { icon: <Radio className="h-3.5 w-3.5" />,     label: 'Live sessions' },
              { icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Analytics' },
            ].map((item) => (
              <span
                key={item.label}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]',
                  item.active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </span>
            ))}
          </nav>
        </aside>

        {/* Body */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              5-Day Momentum Challenge
            </p>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
              live
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground">Day 4 of 5</span>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Stat icon={<Users className="h-3.5 w-3.5" />}       label="Registered" value="247" sub="+14 this week" />
            <Stat icon={<Zap className="h-3.5 w-3.5" />}         label="Activated"  value="189" sub="76% of them" />
            <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completing" value="61%" sub="151 finished" />
            <Stat icon={<Flame className="h-3.5 w-3.5" />}       label="On a streak" value="88"  sub="3 days or more" />
          </div>

          <div className="mt-3 grid gap-2.5 lg:grid-cols-5">
            {/* Day-by-day */}
            <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 lg:col-span-3">
              <p className="text-[11px] font-medium text-foreground">Day-by-day completion</p>
              <div className="mt-3 space-y-2">
                {DAYS.map((d, i) => (
                  <div key={d.label} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 truncate text-[10px] text-muted-foreground">
                      {d.label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          'block h-full origin-left rounded-full bg-primary animate-grow-bar',
                          ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5'][i]
                        )}
                        style={{ width: `${d.pct}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-foreground">
                      {d.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 lg:col-span-2">
              <p className="text-[11px] font-medium text-foreground">Recent activity</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { dot: 'bg-green-500',  text: 'A participant completed Day 3', time: '4m' },
                  { dot: 'bg-primary',    text: '6 new registrations today',      time: '1h' },
                  { dot: 'bg-purple-500', text: 'New post in the feed',           time: '3h' },
                  { dot: 'bg-amber-500',  text: 'Live session tomorrow, 3pm',     time: '5h' },
                ].map((a) => (
                  <div key={a.text} className="flex items-start gap-2">
                    <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', a.dot)} />
                    <p className="min-w-0 flex-1 text-[10px] leading-snug text-foreground">{a.text}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

// ─── Floating cards that sit over the hero mockup ────────────────────────────

export function StreakCard() {
  return (
    <div className="w-[190px] rounded-xl border border-border/80 bg-card/95 p-3.5 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
          <Flame className="h-4 w-4" />
          <span className="absolute inset-0 rounded-lg bg-orange-400/40 animate-pulse-ring" />
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-none text-foreground">7-day streak</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Best yet — keep going</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full bg-orange-400" />
        ))}
      </div>
    </div>
  )
}

export function BadgeCard() {
  return (
    <div className="w-[205px] rounded-xl border border-border/80 bg-card/95 p-3.5 shadow-xl shadow-primary/10 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg">
          🏆
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            Halfway there
          </p>
          <p className="text-[10px] text-muted-foreground">Badge earned · +50 points</p>
        </div>
      </div>
    </div>
  )
}

// ─── Section 4: the participant's day ────────────────────────────────────────

export function DailyExperienceMockup() {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-card shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-muted/40 px-5 py-2 text-[10px] text-muted-foreground">
          <span>9:41</span>
          <span className="h-1 w-16 rounded-full bg-foreground/20" />
          <span>100%</span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
              Day 3 of 5
            </span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-orange-600">
              <Flame className="h-3 w-3" /> 7
            </span>
          </div>

          <h3 className="mt-3 text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Craft your offer
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Today you turn what you do into something someone can say yes to.
          </p>

          {/* Progress */}
          <div className="mt-3.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full w-3/5 origin-left rounded-full bg-primary animate-grow-bar" />
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">3/5</span>
          </div>

          {/* Blocks */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/30 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Play className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-foreground">Watch: the offer stack</p>
                <p className="text-[10px] text-muted-foreground">6 min</p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">Write your offer</p>
                  <p className="text-[10px] text-primary">Required</p>
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-border/70 bg-background p-2">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  For coaches who feel invisible, I run a 5-day sprint that…
                  <span className="ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-primary" />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-foreground">Day 4 — Outreach</p>
                <p className="text-[10px] text-muted-foreground">Unlocks at midnight</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-primary py-2.5 text-center text-[12px] font-semibold text-primary-foreground">
            Complete Day 3
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section 5: community and gamification ───────────────────────────────────

export function CommunityMockup() {
  return (
    <div className="space-y-3">
      {/* A post */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            AL
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-foreground">A participant</p>
            <p className="text-[11px] text-muted-foreground">Day 3 · 20 minutes ago</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            🏆 Halfway
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-foreground">
          Rewrote my offer three times today and the third one finally sounds like
          a person said it. Day 3 done.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[
            { e: '👏', n: 12, on: true },
            { e: '🔥', n: 7 },
            { e: '💡', n: 3 },
          ].map((r) => (
            <span
              key={r.e}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
                r.on
                  ? 'border-primary/30 bg-primary/[0.07] text-primary'
                  : 'border-transparent bg-muted/60 text-muted-foreground'
              )}
            >
              {r.e} {r.n}
            </span>
          ))}
          <span className="ml-1 text-[11px] text-muted-foreground">4 comments</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <p className="text-[13px] font-semibold text-foreground">This week</p>
          <span className="ml-auto text-[10px] text-muted-foreground">optional — off by default</span>
        </div>
        <ul className="mt-3 space-y-2">
          {[
            { rank: 1, points: 480, w: '100%' },
            { rank: 2, points: 425, w: '88%' },
            { rank: 3, points: 390, w: '81%' },
          ].map((r) => (
            <li key={r.rank} className="flex items-center gap-2.5">
              <span className="w-4 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {r.rank}
              </span>
              <span className="h-7 w-7 shrink-0 rounded-full bg-muted" />
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full origin-left rounded-full bg-gradient-to-r from-primary/70 to-primary animate-grow-bar"
                  style={{ width: r.w }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-[11px] font-medium tabular-nums text-foreground">
                {r.points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Section 6: analytics ────────────────────────────────────────────────────

const TREND = [18, 26, 22, 34, 41, 38, 52, 47, 61, 58, 72, 68, 84, 91]

export function AnalyticsMockup() {
  const max = Math.max(...TREND)
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-primary/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Registrations</p>
          <p className="text-[11px] text-muted-foreground">Last 14 days</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
          <TrendingUp className="h-3 w-3" /> +38%
        </span>
      </div>

      {/* Chart */}
      <div className="mt-5 flex h-28 items-end gap-1.5">
        {TREND.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-primary/25 to-primary animate-fade-up"
            style={{ height: `${(v / max) * 100}%`, animationDelay: `${i * 35}ms` }}
          />
        ))}
      </div>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
        {[
          { label: 'Activation', value: '76%' },
          { label: 'Completion', value: '61%' },
          { label: 'Offer clicks', value: '43' },
        ].map((m) => (
          <div key={m.label}>
            <p className="text-[17px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {m.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* At risk */}
      <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
        <p className="text-[11px] font-semibold text-amber-900">3 participants have gone quiet</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-amber-900">
          No submission for three days or more. Named, so a nudge can be personal.
        </p>
      </div>
    </div>
  )
}
