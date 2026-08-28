/**
 * One mockup per feature category on the features page.
 *
 * Built in markup for the same reasons as the homepage set: a screenshot goes
 * stale, weighs a lot, and says nothing to a screen reader. Each is decorative
 * (`aria-hidden` is applied by the section that renders it) and the prose
 * beside it carries the meaning.
 *
 * They share one imaginary challenge — a 5-day launch with an orientation and
 * four days — so a reader scrolling the page sees the same product from
 * thirteen angles rather than thirteen unrelated screens.
 */

import {
  Play, FileText, CheckSquare, Image as ImageIcon, Download, MessageSquareQuote,
  Lock, CheckCircle2, Flame, Trophy, Mail, Radio, Calendar, TrendingUp,
  Upload, Clock, Users, ArrowUpRight, ShieldCheck, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Shared pieces ───────────────────────────────────────────────────────────

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-primary/5',
        className
      )}
    >
      {children}
    </div>
  )
}

function PanelTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-[13px] font-semibold text-foreground">{children}</p>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

function DragHandle() {
  return (
    <span className="flex h-5 w-4 shrink-0 flex-col justify-center gap-[3px]">
      {[0, 1, 2].map((n) => (
        <span key={n} className="h-[2px] w-3.5 rounded-full bg-border" />
      ))}
    </span>
  )
}

// ─── 1. Challenge Builder ────────────────────────────────────────────────────

const BLOCKS = [
  { icon: <FileText className="h-3.5 w-3.5" />,      label: 'Heading',    sub: '“Craft your offer”' },
  { icon: <Play className="h-3.5 w-3.5" />,          label: 'Video',      sub: 'The offer stack · 6 min' },
  { icon: <CheckSquare className="h-3.5 w-3.5" />,   label: 'Assignment', sub: 'Write your offer', required: true },
  { icon: <MessageSquareQuote className="h-3.5 w-3.5" />, label: 'Reflection', sub: 'What felt hardest?', required: true },
  { icon: <Download className="h-3.5 w-3.5" />,      label: 'Download',   sub: 'Offer worksheet.pdf' },
]

export function BuilderShowcase() {
  return (
    <Panel>
      <PanelTitle note="Day 3 of 5">Step builder</PanelTitle>
      <div className="space-y-2">
        {BLOCKS.map((b) => (
          <div key={b.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-2.5">
            <DragHandle />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {b.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground">{b.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{b.sub}</p>
            </div>
            {b.required && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Required
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-2.5 text-[12px] text-muted-foreground">
          + Add a block
        </div>
      </div>
    </Panel>
  )
}

// ─── 2. Flexible Scheduling ──────────────────────────────────────────────────

export function SchedulingShowcase() {
  return (
    <Panel>
      <PanelTitle note="America/New_York">Unlock schedule</PanelTitle>

      <div className="grid grid-cols-2 gap-2">
        {[
          { mode: 'Cohort', desc: 'Everyone on the same day', on: true },
          { mode: 'Evergreen', desc: 'Own Day 1 from joining' },
        ].map((m) => (
          <div
            key={m.mode}
            className={cn(
              'rounded-xl border p-3',
              m.on ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/70 bg-background'
            )}
          >
            <p className={cn('text-[12px] font-semibold', m.on ? 'text-primary' : 'text-foreground')}>
              {m.mode}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5">
        {[
          { day: 'Orientation', when: 'Open now', state: 'open' },
          { day: 'Day 1 — Big Idea', when: 'Open now', state: 'open' },
          { day: 'Day 2 — Your Buyer', when: 'Open now', state: 'open' },
          { day: 'Day 3 — The Offer', when: 'Today, 00:00', state: 'today' },
          { day: 'Day 4 — Outreach', when: 'Tomorrow, 00:00', state: 'locked' },
        ].map((s) => (
          <div key={s.day} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                s.state === 'locked'
                  ? 'bg-muted text-muted-foreground'
                  : s.state === 'today'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-green-100 text-green-700'
              )}
            >
              {s.state === 'locked'
                ? <Lock className="h-3 w-3" />
                : s.state === 'today'
                  ? <Clock className="h-3 w-3" />
                  : <CheckCircle2 className="h-3 w-3" />}
            </span>
            <p className="min-w-0 flex-1 truncate text-[11px] text-foreground">{s.day}</p>
            <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.when}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Midnight is local midnight — in the challenge’s timezone, across a
        daylight-saving change.
      </p>
    </Panel>
  )
}

// ─── 3. Participant Experience ───────────────────────────────────────────────

export function ParticipantShowcase() {
  return (
    <div className="mx-auto w-full max-w-[290px]">
      <div className="overflow-hidden rounded-[1.9rem] border-[6px] border-foreground/85 bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-muted/40 px-5 py-2 text-[10px] text-muted-foreground">
          <span>9:41</span>
          <span className="h-1 w-14 rounded-full bg-foreground/20" />
          <span>100%</span>
        </div>
        <div className="p-4">
          <p className="text-[11px] text-muted-foreground">5-Day Momentum Challenge</p>
          <h3 className="mt-1 text-[16px] font-bold leading-tight tracking-tight text-foreground">
            Welcome back
          </h3>

          <div className="mt-3.5 rounded-xl bg-primary p-3.5 text-primary-foreground">
            <p className="text-[10px] uppercase tracking-wide opacity-90">Today</p>
            <p className="mt-1 text-[14px] font-semibold leading-tight">Day 3 — Craft your offer</p>
            <p className="mt-2 text-[11px] opacity-90">2 of 4 blocks done</p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full w-1/2 origin-left rounded-full bg-white animate-grow-bar" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: <Flame className="h-3.5 w-3.5" />, value: '7', label: 'streak' },
              { icon: <Star className="h-3.5 w-3.5" />,  value: '350', label: 'points' },
              { icon: <Trophy className="h-3.5 w-3.5" />, value: '3', label: 'badges' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/70 bg-background p-2">
                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {s.icon}
                </span>
                <p className="mt-1.5 text-[13px] font-semibold leading-none text-foreground tabular-nums">
                  {s.value}
                </p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            {[
              { d: 'Orientation', done: true },
              { d: 'Day 1 — Big Idea', done: true },
              { d: 'Day 2 — Your Buyer', done: true },
              { d: 'Day 4 — Outreach', locked: true },
            ].map((r) => (
              <div key={r.d} className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-1.5">
                {r.done
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  : <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                <p className="truncate text-[11px] text-foreground">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 4. Daily Content and Tasks ──────────────────────────────────────────────

const BLOCK_TYPES = [
  { icon: <FileText className="h-4 w-4" />,           label: 'Heading' },
  { icon: <MessageSquareQuote className="h-4 w-4" />, label: 'Text' },
  { icon: <Play className="h-4 w-4" />,               label: 'Video' },
  { icon: <ImageIcon className="h-4 w-4" />,          label: 'Image' },
  { icon: <Download className="h-4 w-4" />,           label: 'Download' },
  { icon: <CheckSquare className="h-4 w-4" />,        label: 'Checklist' },
  { icon: <FileText className="h-4 w-4" />,           label: 'Assignment' },
  { icon: <MessageSquareQuote className="h-4 w-4" />, label: 'Reflection' },
  { icon: <Users className="h-4 w-4" />,              label: 'Discussion' },
  { icon: <Upload className="h-4 w-4" />,             label: 'File upload' },
]

export function ContentShowcase() {
  return (
    <Panel>
      <PanelTitle note="drag any of them in">Content blocks</PanelTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BLOCK_TYPES.map((b) => (
          <div
            key={b.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-background p-3 text-center"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {b.icon}
            </span>
            <p className="text-[11px] font-medium leading-tight text-foreground">{b.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-[11px] leading-relaxed text-foreground">
          Mark a block <span className="font-semibold">Required</span> and the day
          will not complete without it.
        </p>
      </div>
    </Panel>
  )
}

// ─── 5. File Submissions ─────────────────────────────────────────────────────

export function SubmissionsShowcase() {
  return (
    <Panel>
      <PanelTitle note="Day 3 · Write your offer">Submission</PanelTitle>

      <div className="rounded-xl border border-border/70 bg-background p-3.5">
        <p className="text-[11px] leading-relaxed text-foreground">
          For coaches who feel invisible, I run a 5-day sprint that turns what
          they already know into an offer people say yes to.
        </p>
        <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            <Lock className="h-3 w-3" /> Private
          </span>
          <span className="text-[10px] text-muted-foreground">
            visible to facilitators with permission only
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground">Reviewed</p>
            <p className="text-[11px] text-muted-foreground">Feedback sent to the participant</p>
          </div>
        </div>
        <p className="mt-2.5 rounded-lg bg-background px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Feedback: </span>
          The second half is the strong part — lead with it.
        </p>
      </div>

      {/* File uploads are not built. Saying so here is better than a mockup
          that implies they are. */}
      <div className="mt-3 rounded-xl border border-dashed border-border p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Upload className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground">File uploads</p>
            <p className="text-[11px] text-muted-foreground">
              In progress — not available yet
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}

// ─── 6. Community Feed ───────────────────────────────────────────────────────

export function FeedShowcase() {
  return (
    <Panel>
      <PanelTitle note="Day 3">Challenge feed</PanelTitle>
      <div className="space-y-2.5">
        {[
          { initials: 'AL', body: 'Rewrote my offer three times and the third one finally sounds like a person said it.', meta: '20 minutes ago', badge: '🏆 Halfway' },
          { initials: 'GH', body: 'Day 2 done. The buyer exercise was harder than I expected.', meta: '2 hours ago' },
        ].map((p) => (
          <div key={p.initials} className="rounded-xl border border-border/70 bg-background p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {p.initials}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight text-foreground">A participant</p>
                <p className="text-[10px] text-muted-foreground">{p.meta}</p>
              </div>
              {p.badge && (
                <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                  {p.badge}
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
        <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10" />
        <p className="text-[11px] text-muted-foreground">Share how today went…</p>
      </div>
    </Panel>
  )
}

// ─── 7. Comments and Reactions ───────────────────────────────────────────────

export function ReactionsShowcase() {
  return (
    <Panel>
      <PanelTitle>Reactions and replies</PanelTitle>

      <div className="flex flex-wrap gap-1.5">
        {[
          { e: '👏', n: 12, on: true },
          { e: '🔥', n: 7 },
          { e: '💡', n: 3 },
          { e: '❤️', n: 5 },
          { e: '🎉', n: 2 },
        ].map((r) => (
          <span
            key={r.e}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
              r.on
                ? 'border-primary/30 bg-primary/[0.07] text-primary'
                : 'border-border/70 bg-background text-muted-foreground'
            )}
          >
            {r.e} <span className="tabular-nums">{r.n}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2.5 border-l-2 border-border pl-3.5">
        {[
          { initials: 'GH', body: 'That second version was already good — this one is sharper.' },
          { initials: 'OO', body: 'Bring this to the Q&A tomorrow and we will pull it apart together.', host: true },
        ].map((c) => (
          <div key={c.initials} className="flex gap-2.5">
            <span className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
              c.host ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {c.initials}
            </span>
            <div className="min-w-0">
              {c.host && (
                <span className="mb-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                  Host
                </span>
              )}
              <p className="text-[11px] leading-relaxed text-foreground">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Moderation hides rather than deletes, so who removed what — and when —
        always has an answer.
      </p>
    </Panel>
  )
}

// ─── 8. Points and Streaks ───────────────────────────────────────────────────

export function PointsShowcase() {
  return (
    <Panel>
      <PanelTitle note="this week">Points and streak</PanelTitle>

      <div className="rounded-xl border border-orange-200/70 bg-orange-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Flame className="h-5 w-5" />
            <span className="absolute inset-0 rounded-xl bg-orange-400/40 animate-pulse-ring" />
          </span>
          <div>
            <p className="text-[20px] font-bold leading-none text-foreground">7 days</p>
            <p className="mt-1 text-[11px] text-orange-900">Longest streak yet</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="h-2 flex-1 rounded-full bg-orange-400" />
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {[
          { what: 'Completed Day 3', pts: '+50' },
          { what: 'Posted in the feed', pts: '+15' },
          { what: 'Commented on a post', pts: '+5' },
          { what: 'Daily cap reached', pts: '—', muted: true },
        ].map((e) => (
          <li key={e.what} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2">
            <p className={cn('min-w-0 flex-1 truncate text-[11px]', e.muted ? 'text-muted-foreground' : 'text-foreground')}>
              {e.what}
            </p>
            <span className={cn(
              'shrink-0 text-[11px] font-semibold tabular-nums',
              e.muted ? 'text-muted-foreground' : 'text-primary'
            )}>
              {e.pts}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Community points are capped per day, so posting twenty times in an
        evening cannot out-earn doing the challenge.
      </p>
    </Panel>
  )
}

// ─── 9. Badges and Leaderboards ──────────────────────────────────────────────

const BADGES = [
  { icon: '🌱', name: 'First step', earned: true },
  { icon: '🏆', name: 'Halfway', earned: true },
  { icon: '💬', name: 'Encourager', earned: true },
  { icon: '🔥', name: '3-day streak', earned: true },
  { icon: '⚡', name: '7-day streak' },
  { icon: '🎓', name: 'Finisher' },
]

export function BadgesShowcase() {
  return (
    <Panel>
      <PanelTitle note="3 of 6 earned">Badges</PanelTitle>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => (
          <div
            key={b.name}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center',
              b.earned
                ? 'border-amber-200/80 bg-amber-50/60'
                : 'border-dashed border-border bg-muted/20'
            )}
          >
            <span className={cn('text-xl', !b.earned && 'grayscale')} aria-hidden="true">
              {b.icon}
            </span>
            <p className={cn(
              'text-[10px] font-medium leading-tight',
              b.earned ? 'text-amber-900' : 'text-muted-foreground'
            )}>
              {b.name}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border/70 bg-background p-3.5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <p className="text-[12px] font-semibold text-foreground">Leaderboard</p>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            optional
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {[
            { rank: 1, pts: 480, w: '100%' },
            { rank: 2, pts: 425, w: '88%' },
            { rank: 3, pts: 350, w: '73%', you: true },
          ].map((r) => (
            <li key={r.rank} className="flex items-center gap-2.5">
              <span className="w-3 text-[11px] font-semibold tabular-nums text-muted-foreground">{r.rank}</span>
              <span className="h-6 w-6 shrink-0 rounded-full bg-muted" />
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    'block h-full origin-left rounded-full animate-grow-bar',
                    r.you ? 'bg-primary' : 'bg-primary/40'
                  )}
                  style={{ width: r.w }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-[11px] font-medium tabular-nums text-foreground">
                {r.pts}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

// ─── 10. Notifications and Communication ─────────────────────────────────────

const TRIGGERS = [
  { name: 'Registration confirmed', on: true },
  { name: 'Challenge starts tomorrow', on: true },
  { name: 'Day unlocked', on: true },
  { name: 'Gone quiet for 2 days', on: true },
  { name: 'Halfway there', on: false },
  { name: 'Feedback on your work', on: true },
  { name: 'Live session reminder', on: true },
  { name: 'Challenge complete', on: true },
]

export function CommsShowcase() {
  return (
    <Panel>
      <PanelTitle note="per challenge">Message triggers</PanelTitle>
      <ul className="space-y-1.5">
        {TRIGGERS.map((t) => (
          <li key={t.name} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2">
            <Mail className={cn('h-3.5 w-3.5 shrink-0', t.on ? 'text-primary' : 'text-muted-foreground')} />
            <p className={cn('min-w-0 flex-1 truncate text-[11px]', t.on ? 'text-foreground' : 'text-muted-foreground')}>
              {t.name}
            </p>
            <span
              className={cn(
                'flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition-colors',
                t.on ? 'justify-end bg-primary' : 'justify-start bg-muted'
              )}
            >
              <span className="h-3 w-3 rounded-full bg-white shadow-sm" />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 text-center">
        {[
          { label: 'sent', value: '1,284' },
          { label: 'skipped', value: '37' },
          { label: 'failed', value: '0' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[14px] font-semibold leading-none text-foreground tabular-nums">{s.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─── 11. Live Sessions ───────────────────────────────────────────────────────

export function SessionsShowcase() {
  return (
    <Panel>
      <PanelTitle note="2 scheduled">Live sessions</PanelTitle>

      <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Radio className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight text-foreground">Day 4 Q&A — Outreach</p>
            <p className="text-[11px] text-muted-foreground">Tomorrow, 3:00 PM · 45 min</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="flex-1 rounded-lg bg-primary py-1.5 text-center text-[11px] font-semibold text-primary-foreground">
            Join
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] text-foreground">
            <Calendar className="h-3 w-3" /> Add to calendar
          </span>
        </div>
      </div>

      <div className="mt-2.5 rounded-xl border border-border/70 bg-background p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Play className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium leading-tight text-foreground">Kickoff call</p>
            <p className="text-[11px] text-muted-foreground">Replay available</p>
          </div>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        The calendar file is a real .ics — it lands in their calendar, not in a
        list they will forget to check.
      </p>
    </Panel>
  )
}

// ─── 12. Offers and CTAs ─────────────────────────────────────────────────────

export function OfferShowcase() {
  return (
    <Panel>
      <PanelTitle note="shown after Day 5">Closing offer</PanelTitle>

      <div className="rounded-xl border border-border/70 bg-background p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Your next step</p>
        <p className="mt-1.5 text-[15px] font-bold leading-tight text-foreground">
          The 12-week Momentum Programme
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Everything from the challenge, taken all the way through.
        </p>
        <ul className="mt-3 space-y-1.5">
          {['Weekly group calls', 'Private community', 'Offer review with me'].map((b) => (
            <li key={b} className="flex items-center gap-2 text-[11px] text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              {b}
            </li>
          ))}
        </ul>
        <span className="mt-3.5 block rounded-lg bg-primary py-2 text-center text-[12px] font-semibold text-primary-foreground">
          Join the programme
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
        <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground">43 clicks through</p>
          <p className="text-[10px] text-muted-foreground">counted per challenge</p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        The link is yours. No payment passes through Challenge Studio, and no
        cut is taken.
      </p>
    </Panel>
  )
}

// ─── 13. Analytics ───────────────────────────────────────────────────────────

const CURVE = [94, 88, 79, 61, 42]

export function AnalyticsShowcase() {
  return (
    <Panel>
      <PanelTitle note="counted, not estimated">Challenge analytics</PanelTitle>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Registered', value: '247' },
          { label: 'Activated', value: '76%' },
          { label: 'Completed', value: '61%' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border/70 bg-background p-3">
            <p className="text-[17px] font-semibold leading-none text-foreground tabular-nums">{m.value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-border/70 bg-background p-3.5">
        <p className="text-[11px] font-medium text-foreground">Day by day</p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {CURVE.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className="w-full rounded-t bg-gradient-to-t from-primary/25 to-primary animate-fade-up"
                style={{ height: `${v}%`, animationDelay: `${i * 70}ms` }}
              />
              <span className="text-[9px] tabular-nums text-muted-foreground">{v}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
        <p className="text-[11px] font-semibold text-amber-900">3 have gone quiet</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-amber-900">
          Named, with how long it has been — so the nudge can be a real message.
        </p>
      </div>
    </Panel>
  )
}
