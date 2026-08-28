// Route: / — the marketing homepage.
//
// One thing to know before editing: the two social-proof sections do not
// invent customers.
//
// The old version of this page carried three testimonials attributed to
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

import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Sparkles, Blocks, PlayCircle, TrendingUp,
  Users, Trophy, Mail, BarChart3, CalendarClock, Radio, ShieldCheck,
  Smartphone, Layers, Quote, Mic, BookOpen, GraduationCap, HeartPulse,
  Church, Building2, HandHeart, Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/shared/logo'
import {
  DashboardMockup, StreakCard, BadgeCard, DailyExperienceMockup,
  CommunityMockup, AnalyticsMockup,
} from './_components/mockups'

export const metadata = {
  title: 'Challenge Studio — Build a challenge. Guide a transformation.',
  description:
    'Create, launch and run multi-day challenges that people actually finish. Content, daily action, progress, community and rewards in one place.',
}

// ─── Section 1: who it is built for ──────────────────────────────────────────

const BUILT_FOR = [
  { icon: <Mic className="h-4 w-4" />,           label: 'Coaches' },
  { icon: <BookOpen className="h-4 w-4" />,      label: 'Authors' },
  { icon: <GraduationCap className="h-4 w-4" />, label: 'Course creators' },
  { icon: <Users className="h-4 w-4" />,         label: 'Communities' },
  { icon: <HeartPulse className="h-4 w-4" />,    label: 'Wellness leaders' },
  { icon: <Church className="h-4 w-4" />,        label: 'Churches' },
  { icon: <Building2 className="h-4 w-4" />,     label: 'Teams' },
  { icon: <Briefcase className="h-4 w-4" />,     label: 'Agencies' },
  { icon: <HandHeart className="h-4 w-4" />,     label: 'Nonprofits' },
]

// ─── Section 2: build, run, grow ─────────────────────────────────────────────

const PILLARS = [
  {
    step: 'Build',
    icon: <Blocks className="h-6 w-6" />,
    headline: 'Design the days, not a page',
    body: 'Assemble each day from content blocks — video, downloads, checklists, assignments, reflections. Mark the ones that matter as required, and completion starts meaning something.',
  },
  {
    step: 'Run',
    icon: <PlayCircle className="h-6 w-6" />,
    headline: 'It carries itself once it starts',
    body: 'Days unlock on schedule in the challenge’s own timezone. Emails go out on their own. The feed keeps people talking. You show up to facilitate, not to operate.',
  },
  {
    step: 'Grow',
    icon: <TrendingUp className="h-6 w-6" />,
    headline: 'See what actually happened',
    body: 'Who started, who finished, which day lost people, and who has gone quiet — counted from the records, not estimated. Then a closing offer for the ones who finished.',
  },
]

// ─── Section 3: the creation workflow ────────────────────────────────────────

const WORKFLOW = [
  { n: '01', title: 'Name the promise', body: 'What someone will be able to do by the end. The wizard asks for it first, because everything else follows from it.' },
  { n: '02', title: 'Build the days',   body: 'Add steps, fill them with blocks, decide what is required. Publish a day at a time or all at once.' },
  { n: '03', title: 'Set the shape',    body: 'Cohort or evergreen, public or invite-only, three days or ninety. Change your mind later; nothing is baked in.' },
  { n: '04', title: 'Open the doors',   body: 'You get a registration page on a shareable URL. A publish gate refuses to let an empty challenge go live.' },
]

// ─── Section 7: the feature grid ─────────────────────────────────────────────

const FEATURES = [
  { icon: <Blocks className="h-5 w-5" />,        title: 'Ten content block types',   body: 'Video, downloads, checklists, assignments, reflections, discussion prompts.' },
  { icon: <CalendarClock className="h-5 w-5" />, title: 'Unlocking that respects time zones', body: 'Local midnight stays local midnight, daylight saving included.' },
  { icon: <Users className="h-5 w-5" />,         title: 'A feed of its own',         body: 'Posts, comments and reactions beside the work — no Facebook Group.' },
  { icon: <Trophy className="h-5 w-5" />,        title: 'Points, streaks, badges',   body: 'Daily caps, so taking part beats gaming it. Leaderboard optional.' },
  { icon: <Mail className="h-5 w-5" />,          title: 'Automated email',           body: 'Ten triggers, editable per challenge, every send logged.' },
  { icon: <Radio className="h-5 w-5" />,         title: 'Live sessions',             body: 'Join links, replays, and a calendar file participants can save.' },
  { icon: <BarChart3 className="h-5 w-5" />,     title: 'Analytics and export',      body: 'Day-by-day completion, at-risk participants, permission-checked CSV.' },
  { icon: <ShieldCheck className="h-5 w-5" />,   title: 'Private work stays private', body: 'Reflections are withheld on the server, not hidden in the page.' },
  { icon: <Smartphone className="h-5 w-5" />,    title: 'Built for a phone',         body: 'Where participants actually are, in a spare ten minutes.' },
  { icon: <Layers className="h-5 w-5" />,        title: 'Multiple workspaces',       body: 'Separate brands or clients, each with its own team.' },
]

// ─── Section 8: testimonials ─────────────────────────────────────────────────

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

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 animate-fade-up gap-1.5 border border-border/60 bg-background/80 px-4 py-1.5 text-sm font-medium backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              In beta — free while we get it right
            </Badge>

            <h1 className="animate-fade-up delay-1 text-[42px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[68px]">
              Build a challenge.{' '}
              <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                Guide a transformation.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl animate-fade-up delay-2 text-lg leading-relaxed text-muted-foreground">
              A course gets bought and abandoned. A checklist gets closed. A challenge
              gives people a reason to come back tomorrow — content, daily action,
              visible progress, other people, and something to earn.
            </p>

            <div className="mt-9 flex animate-fade-up delay-3 flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto" asChild>
                <Link href="/auth/signup">
                  Create a Challenge <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 w-full bg-background/70 px-8 text-base backdrop-blur sm:w-auto" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>

            <div className="mt-6 flex animate-fade-up delay-4 flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {['No credit card', 'Unlimited participants', 'Live in under an hour'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto mt-14 max-w-5xl animate-fade-up delay-5">
            <div aria-hidden="true">
              <DashboardMockup />
            </div>

            {/* Floating detail cards — the participant's side of the same story */}
            <div
              aria-hidden="true"
              className="absolute -left-14 top-[38%] hidden animate-float xl:block"
              style={{ animationDelay: '0.4s' }}
            >
              <StreakCard />
            </div>
            <div
              aria-hidden="true"
              className="absolute -right-14 bottom-16 hidden animate-float xl:block"
              style={{ animationDelay: '1.6s' }}
            >
              <BadgeCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── 1. Built for ────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Built for the people who run challenges
          </p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {BUILT_FOR.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-sm text-foreground"
              >
                <span className="text-primary">{b.icon}</span>
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 2. Build · Run · Grow ───────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Build it, run it, and see what it did
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three jobs that usually need six tools and a spreadsheet holding them together.
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
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {p.icon}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {String(i + 1).padStart(2, '0')} · {p.step}
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

      {/* ── 3. The creation workflow ────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Creating one
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                From an idea to open registration
              </h2>
              <p className="mt-4 text-muted-foreground">
                A guided wizard, four decisions, and a page you can send to people.
                Nothing to design and no template to fight.
              </p>

              <ol className="mt-10 space-y-7">
                {WORKFLOW.map((w, i) => (
                  <li key={w.n} className="relative flex gap-5">
                    {/* Connector */}
                    {i < WORKFLOW.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[19px] top-11 h-[calc(100%+0.75rem)] w-px bg-border"
                      />
                    )}
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-background text-xs font-bold text-primary">
                      {w.n}
                    </span>
                    <div className="pt-1">
                      <h3 className="font-semibold text-foreground">{w.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Builder illustration */}
            <div aria-hidden="true" className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl shadow-primary/5">
              <p className="text-sm font-semibold text-foreground">Day 3 — Craft your offer</p>
              <p className="mt-0.5 text-xs text-muted-foreground">4 blocks · published</p>
              <div className="mt-5 space-y-2.5">
                {[
                  { label: 'Heading', sub: '“Craft your offer”', required: false },
                  { label: 'Video', sub: 'The offer stack · 6 min', required: false },
                  { label: 'Assignment', sub: 'Write your offer', required: true },
                  { label: 'Reflection', sub: 'What felt hardest?', required: true },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 flex-col justify-center gap-[3px]">
                      {[0, 1, 2].map((n) => (
                        <span key={n} className="h-[2px] w-3.5 rounded-full bg-border" />
                      ))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{b.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.sub}</p>
                    </div>
                    {b.required && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Required
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  + Add a block
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. The participant's day ────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div aria-hidden="true" className="order-2 lg:order-1">
              <DailyExperienceMockup />
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                The participant’s day
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                One day at a time, on the phone in their hand
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Tomorrow is locked, and that is the point. A challenge works because
                there is exactly one thing to do today and it is small enough to
                finish before the coffee goes cold.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { title: 'Today is obvious', body: 'No syllabus to navigate. Open it and the next thing is right there.' },
                  { title: 'Required means required', body: 'A day is complete when the work is done, not when a box is ticked.' },
                  { title: 'Progress they can feel', body: 'A streak, a bar that moves, and a badge at the moments worth marking.' },
                  { title: 'Some things stay theirs', body: 'A reflection can be marked private — other participants never see it.' },
                ].map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{f.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Community and gamification ───────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Community and rewards
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                People finish things other people can see
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                The usual answer is a Facebook Group, where the conversation lives a
                tab away from the work and the algorithm decides who reads it. Here
                the feed belongs to the challenge, sitting beside the day it is about.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: <Users className="h-4 w-4" />,  title: 'A feed per challenge', body: 'Posts, comments, reactions — and moderation that hides rather than deletes.' },
                  { icon: <Trophy className="h-4 w-4" />, title: 'Points and badges',    body: 'Earned for doing the work, capped daily so volume cannot beat effort.' },
                ].map((f) => (
                  <div key={f.title} className="rounded-xl border border-border/70 bg-background p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {f.icon}
                    </span>
                    <p className="mt-3 font-semibold text-foreground">{f.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div aria-hidden="true">
              <CommunityMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Analytics ────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div aria-hidden="true" className="order-2 lg:order-1">
              <AnalyticsMockup />
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                What actually happened
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                The number that matters is who finished
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Registrations flatter everyone. Completion tells you whether the
                challenge worked, which day lost people, and who is about to drop
                out while there is still time to reach them.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { title: 'Counted, never estimated', body: 'Every figure is derived from the records that produced it.' },
                  { title: 'Day-by-day, not just totals', body: 'See exactly which day the curve falls off — that is where to edit.' },
                  { title: 'At-risk participants, by name', body: 'Quiet for three days or more, so the nudge can be a real message.' },
                  { title: 'Export without exposure', body: 'CSV carries counts and dates. Submission text is never in the file.' },
                ].map((f) => (
                  <li key={f.title} className="flex gap-3.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">{f.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Button variant="outline" className="mt-8" asChild>
                <Link href="/features">
                  Everything included <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Feature grid ─────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-muted/25 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Not a course builder with a countdown
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything a challenge needs is here, because a challenge needs all of it
              at once — and stitching it together from six tools is the reason most
              never launch.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/70 bg-background p-5 transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {f.icon}
                </span>
                <p className="mt-3.5 font-semibold leading-snug text-foreground">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Testimonials, when there are real ones ───────────────────── */}
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
            <div className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-muted/25 p-10 text-center sm:p-14">
              <Badge variant="secondary" className="mb-5 px-3.5 py-1 text-sm">
                Early access
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                No testimonials yet — and we are not going to invent any
              </h2>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Challenge Studio is new. The first creators are building on it now,
                and when they have something honest to say about it, their words go
                here with their names on them. Until then this space stays empty on
                purpose.
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                If you would rather judge it yourself than read a quote, the builder
                is free and takes about an hour.
              </p>
              <Button className="mt-8" size="lg" asChild>
                <Link href="/auth/signup">
                  Try it and decide <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 9. Final CTA ────────────────────────────────────────────────── */}
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
            Build it, look at it, and only publish when it is right. Nothing goes
            live until you say so.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              <Link href="/use-cases">See who it is for</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-primary-foreground/80">
            Free during beta · No credit card · Unlimited participants
          </p>
        </div>
      </section>

      {/* ── 10. Footer ──────────────────────────────────────────────────── */}
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
                  { label: 'Use Cases', href: '/use-cases' },
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
