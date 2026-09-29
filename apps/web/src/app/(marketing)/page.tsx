// Route: / — the marketing homepage.
//
// One thing to know before editing: the social-proof section does not invent
// customers.
//
// An earlier version of this page carried three testimonials attributed to
// "Sarah K.", "Marcus T." and "Priya M." — the same placeholder names that
// were sitting in the mock creator dashboard — one of them claiming a
// completion rate "went from 12% to 61%". Those are the words a visitor
// weighs most heavily, and there is no such customer. They are gone.
//
// In their place: the trusted-by strip names the kinds of creator the product
// is built for, which is true and fills the same slot, and TESTIMONIALS below
// is an empty array with the card design ready for it. Add real quotes and
// the section appears; until then the page shows an honest beta panel in the
// same position. Nothing here needs rewriting when the quotes arrive.
//
// The same rule governs the numbers in the mockups: they describe one
// imaginary challenge, defined once in `_components/mockups.tsx`, and none of
// them is presented as a customer's result.

import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Blocks, PlayCircle, TrendingUp,
  Users, Trophy, Mail, CalendarClock, MessagesSquare, Quote,
  Mic, BookOpen, GraduationCap, HeartPulse, Church, Building2,
  HandHeart, Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'
import {
  HeroShowcase, DayBuilderMockup, RetentionMockup, FeedMockup, UnlockMockup,
} from './_components/mockups'

export const metadata = {
  title: 'Challenge Studio — Build a challenge. Guide a transformation.',
  description:
    'Create, launch and run multi-day challenges that people actually finish. Content, daily action, progress, community and rewards in one place.',
}

// ─── Who it is built for ─────────────────────────────────────────────────────

const BUILT_FOR = [
  { icon: <Mic className="h-4 w-4" />,           label: 'Coaches' },
  { icon: <BookOpen className="h-4 w-4" />,      label: 'Authors' },
  { icon: <GraduationCap className="h-4 w-4" />, label: 'Course creators' },
  { icon: <Users className="h-4 w-4" />,         label: 'Community owners' },
  { icon: <HeartPulse className="h-4 w-4" />,    label: 'Wellness leaders' },
  { icon: <Church className="h-4 w-4" />,        label: 'Churches' },
  { icon: <Building2 className="h-4 w-4" />,     label: 'Teams' },
  { icon: <Briefcase className="h-4 w-4" />,     label: 'Agencies' },
  { icon: <HandHeart className="h-4 w-4" />,     label: 'Nonprofits' },
]

// ─── Build · Run · Grow ──────────────────────────────────────────────────────

const PILLARS = [
  {
    step: 'Build',
    icon: <Blocks className="h-5 w-5" />,
    headline: 'Design the days, not a page',
    body: 'A guided setup asks for the promise first. Then you fill each day with blocks — video, worksheet, assignment, reflection — and mark what must be done.',
  },
  {
    step: 'Run',
    icon: <PlayCircle className="h-5 w-5" />,
    headline: 'It carries itself once it starts',
    body: 'Days unlock in each person’s own timezone, emails go out on schedule, and the feed keeps people talking. You show up to lead, not to operate.',
  },
  {
    step: 'Grow',
    icon: <TrendingUp className="h-5 w-5" />,
    headline: 'See what actually happened',
    body: 'Who started, who finished, which day lost people — counted from real records. Then point finishers at your next thing while the momentum is high.',
  },
]

// ─── One engine, many shapes ─────────────────────────────────────────────────

const SHAPES = [
  { title: 'Marketing challenge', body: 'Public registration, daily content, live sessions and a final offer.' },
  { title: 'Cohort challenge',    body: 'A group starts and finishes together on shared dates.' },
  { title: 'Evergreen challenge', body: 'Each person’s Day 1 is the day they join.' },
  { title: 'Habit challenge',     body: 'Repeated check-ins, streaks and optional measurements.' },
  { title: 'Internal challenge',  body: 'Only for members of a community or organisation you already have.' },
  { title: 'Paid challenge',      body: 'Enrolment needs a purchase you took somewhere else.' },
  { title: 'Team challenge',      body: 'People join teams with shared progress and scores.' },
  { title: 'Milestone journey',   body: 'Steps in order, not tied to calendar days.' },
]

/**
 * Lengths a challenge can run for. Rendered as plain chips, not buttons: they
 * illustrate the range rather than offering a choice, and a control that looks
 * pressable but does nothing is worse than a label.
 */
const LENGTHS = ['3 days', '5 days', '7 days', '21 days', '30 days', '90 days', '365 days', 'Milestones']
const LENGTH_EXAMPLE = '5 days'

// ─── Testimonials ────────────────────────────────────────────────────────────

interface Testimonial {
  quote: string
  author: string
  role: string
}

/**
 * Real quotes only. Add them here and the section below renders the cards;
 * leave it empty and an honest beta panel takes the same slot.
 *
 * Whoever fills this in: use a real name and a real role, with permission.
 * An invented testimonial is the one thing on a marketing page a visitor
 * cannot check and will believe entirely.
 */
const TESTIMONIALS: Testimonial[] = []

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mesh">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-20">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            {/* Copy */}
            <div>
              <Badge
                variant="secondary"
                className="mb-6 animate-fade-up gap-2 border border-border/60 bg-background/80 px-3.5 py-1.5 text-sm font-medium backdrop-blur"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Free during beta — no card needed
              </Badge>

              <h1 className="animate-fade-up delay-1 text-[40px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[56px] lg:text-[62px]">
                Build a challenge.{' '}
                <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                  Guide a transformation.
                </span>
              </h1>

              <p className="mt-6 max-w-xl animate-fade-up delay-2 text-lg leading-relaxed text-muted-foreground">
                Courses get bought and abandoned. A challenge gives people one clear
                thing to do today, others doing it beside them, and progress they can
                see. Build it here, run it here, and see exactly who finished.
              </p>

              <div className="mt-9 flex animate-fade-up delay-3 flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 px-7 text-base" asChild>
                  <Link href="/auth/signup">
                    Create your first challenge <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 bg-background/70 px-7 text-base backdrop-blur"
                  asChild
                >
                  <Link href="#how-it-works">
                    <PlayCircle className="mr-2 h-4 w-4" /> Walk through a 5-day example
                  </Link>
                </Button>
              </div>

              <ul className="mt-7 flex animate-fade-up delay-4 flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {['Live in under an hour', 'Unlimited participants in beta', 'No app to install'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Product preview */}
            <div aria-hidden="true" className="animate-fade-up delay-5 lg:pl-6">
              <HeroShowcase />
            </div>
          </div>
        </div>
      </section>

      {/* ── Built for ───────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Built for people who run challenges
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {BUILT_FOR.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm text-foreground"
              >
                <span className="text-primary" aria-hidden="true">{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                From an idea to a finish line in three moves
              </h2>
            </div>
            <p className="text-muted-foreground lg:pb-1">
              Three jobs that usually need six tools and a spreadsheet holding them
              together.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Card key={p.step} className="relative overflow-hidden border-border/60">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-violet-500"
                />
                <CardContent className="p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {p.icon}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {i + 1} · {p.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{p.headline}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Everything in one place ─────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Everything in one place
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Not a course builder with a countdown
            </h2>
            <p className="mt-4 text-muted-foreground">
              Stitching six tools together is the reason most challenges never launch.
              Here, every piece already knows about the others.
            </p>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {/* The builder — the one that earns the extra width */}
            <div className="rounded-2xl border border-border/70 bg-background p-6 lg:col-span-2">
              <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Blocks className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    Build each day, block by block
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Ten block types, drag to reorder, mark what is required. A publish
                    check catches empty days and missing links before your participants
                    do.
                  </p>
                  <Link
                    href="/features"
                    className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    See the builder <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
                <div aria-hidden="true">
                  <DayBuilderMockup />
                </div>
              </div>
            </div>

            {/* Unlocking */}
            <div className="rounded-2xl border border-border/70 bg-background p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Unlocks on their clock
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Cohort, evergreen or self-paced. Day 2 opens at 8 AM wherever each
                person lives — daylight saving included.
              </p>
              <div className="mt-5" aria-hidden="true">
                <UnlockMockup />
              </div>
            </div>

            {/* Community */}
            <div className="rounded-2xl border border-border/70 bg-background p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessagesSquare className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                A feed that belongs to the challenge
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Posts, comments and reactions beside the work — no Facebook Group, no
                algorithm deciding who sees what.
              </p>
              <div className="mt-5" aria-hidden="true">
                <FeedMockup />
              </div>
            </div>

            {/* Rewards — the one dark cell.
                Fixed slate rather than `bg-foreground`: that token flips with the
                theme, so in dark mode the deliberately dark card would render
                white and become the brightest thing on the page. */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Trophy className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">Points, streaks and badges</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Earned for doing the work, capped so volume cannot beat effort.
                Leaderboard optional — off for sensitive groups.
              </p>
              <div className="mt-5 flex gap-1.5" aria-hidden="true">
                {[100, 100, 100, 100, 60, 25].map((w, i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-amber-400"
                    style={{ opacity: w / 100 }}
                  />
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-border/70 bg-background p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Emails that send themselves
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Confirmation, day unlocked, live-session reminder, “we miss you” nudge,
                completion. Edit the words, keep the timing.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/features">
                See all features <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Analytics ───────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div aria-hidden="true" className="order-2 lg:order-1">
              <RetentionMockup />
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Analytics
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                The number that matters is who finished
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Registrations flatter everyone. Completion tells you whether the
                challenge worked, which day lost people, and who is about to drop out
                while there is still time to reach them.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { title: 'Counted, never estimated.', body: 'Every figure comes from the records that produced it.' },
                  { title: 'At-risk list, by name.', body: 'Quiet for two days or more? One click sends a real nudge.' },
                  { title: 'Export without exposure.', body: 'CSV carries counts and dates; private reflections never leave.' },
                ].map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <p className="leading-relaxed">
                      <span className="font-semibold text-foreground">{f.title}</span>{' '}
                      <span className="text-muted-foreground">{f.body}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── One engine, many shapes ─────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                One engine
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Pick the shape,
                <br className="hidden sm:block" /> not the product
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                A prayer challenge and a sales sprint are the same thing underneath: a
                promise, a schedule, daily steps. These are settings — change your mind
                after you build.
              </p>

              <p className="mt-8 text-sm font-medium text-foreground">
                However long it needs to be
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {LENGTHS.map((l) => (
                  <li
                    key={l}
                    className={
                      l === LENGTH_EXAMPLE
                        ? 'rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                        : 'rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm text-muted-foreground'
                    }
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {SHAPES.map((s) => (
                <li
                  key={s.title}
                  className="rounded-xl border border-border/70 bg-background p-5 transition-colors hover:border-primary/40"
                >
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Testimonials, when there are real ones ──────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          {TESTIMONIALS.length > 0 ? (
            <>
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  What creators are saying
                </h2>
              </div>
              <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {TESTIMONIALS.map((t) => (
                  <Card key={t.author} className="border-border/60">
                    <CardContent className="flex h-full flex-col p-7">
                      <Quote className="h-7 w-7 text-primary/25" aria-hidden="true" />
                      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground">
                        {t.quote}
                      </blockquote>
                      <footer className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {t.author.slice(0, 1)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.author}</p>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                      </footer>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-5 px-3.5 py-1 text-sm">
                Early access
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                No testimonials yet — and we are not going to invent any
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
                The first creators are building on Challenge Studio now. When they have
                something honest to say about it, their words go here with their names
                on them. Until then, the builder is free — judge it yourself in about
                an hour.
              </p>
              <Button variant="link" className="mt-4 text-base" asChild>
                <Link href="/auth/signup">
                  Try it and decide <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(60% 60% at 20% 0%, rgba(255,255,255,0.25) 0%, transparent 60%), radial-gradient(50% 50% at 80% 100%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-[42px] sm:leading-tight">
            Your challenge is a weekend of work away
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/90">
            Build it, look at it, and only publish when it is right. Nothing goes live
            until you say so.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
              <Link href="/auth/signup">
                Create a challenge <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto"
              asChild
            >
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-primary-foreground/80">
            Free during beta · No credit card · Unlimited participants
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Logo className="h-10" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Build a challenge. Guide a transformation. Turn participation into
                momentum, community, and measurable results.
              </p>
            </div>

            {[
              {
                heading: 'Product',
                links: [
                  { label: 'Features', href: '/features' },
                  { label: 'Use cases', href: '/use-cases' },
                  { label: 'Pricing', href: '/pricing' },
                ],
              },
              {
                heading: 'Get started',
                links: [
                  { label: 'Create an account', href: '/auth/signup' },
                  { label: 'Sign in', href: '/auth/login' },
                ],
              },
              {
                heading: 'Legal',
                links: [
                  { label: 'Privacy', href: '/legal/privacy' },
                  { label: 'Terms', href: '/legal/terms' },
                ],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {col.heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-7 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © 2026 Smartstack Platforms LLC. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Challenge Studio is in beta.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
