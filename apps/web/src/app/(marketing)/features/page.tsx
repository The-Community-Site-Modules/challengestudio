// Route: /features
//
// Thirteen categories, each a showcase section alternating side to side, with
// a sticky category bar that tracks where you are.
//
// One honesty note. **File uploads are not built** — lib/storage throws by
// design while the provider decision (OD-02) is open. The Submissions section
// below says so in plain words and its mockup marks uploads as in progress,
// rather than showing a working dropzone. Everything else on this page can be
// opened in a live workspace today.

import Link from 'next/link'
import {
  ArrowRight, Blocks, CalendarClock, Smartphone, LayoutList, Upload,
  Users, MessageSquare, Flame, Trophy, Mail, Radio, Megaphone, BarChart3,
  CheckCircle2, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeatureNav, type NavItem } from './_components/feature-nav'
import {
  BuilderShowcase, SchedulingShowcase, ParticipantShowcase, ContentShowcase,
  SubmissionsShowcase, FeedShowcase, ReactionsShowcase, PointsShowcase,
  BadgesShowcase, CommsShowcase, SessionsShowcase, OfferShowcase,
  AnalyticsShowcase,
} from './_components/showcases'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Features — Challenge Studio',
  description:
    'The builder, scheduling, the participant experience, submissions, community, points and badges, communications, live sessions, offers and analytics.',
}

// ─── The thirteen ────────────────────────────────────────────────────────────

interface Category {
  id: string
  nav: string
  eyebrow: string
  icon: React.ReactNode
  title: string
  lead: string
  points: string[]
  showcase: React.ReactNode
  /** Rendered as a small note under the points — used for what is not ready. */
  caveat?: string
}

const CATEGORIES: Category[] = [
  {
    id: 'builder',
    nav: 'Builder',
    eyebrow: 'Challenge Builder',
    icon: <Blocks className="h-5 w-5" />,
    title: 'Build the days, block by block',
    lead: 'Drag content into a day, mark what matters as required, publish one step or all of them.',
    points: [
      'Ten block types, reorderable',
      'Required blocks gate completion',
      'Publish per step, not only per challenge',
      'A gate that refuses to launch an empty challenge',
    ],
    showcase: <BuilderShowcase />,
  },
  {
    id: 'scheduling',
    nav: 'Scheduling',
    eyebrow: 'Flexible Scheduling',
    icon: <CalendarClock className="h-5 w-5" />,
    title: 'Cohort, evergreen, or somewhere in between',
    lead: 'One engine, several shapes. Change the shape after you have built it.',
    points: [
      'Six modes — cohort, evergreen, self-paced, sprint, drip, live event',
      'Any length: 3 days, 30, 365, or milestones',
      'Days open at local midnight, in the challenge’s timezone',
      'Daylight saving handled — midnight stays midnight',
    ],
    showcase: <SchedulingShowcase />,
  },
  {
    id: 'participant',
    nav: 'Participants',
    eyebrow: 'Participant Experience',
    icon: <Smartphone className="h-5 w-5" />,
    title: 'One thing to do, on the phone in their hand',
    lead: 'Tomorrow is locked. Today is obvious. That is most of why challenges work.',
    points: [
      'A hub that opens on today',
      'Progress, streak and points at a glance',
      'Built for a phone, not shrunk to fit one',
      'Private, invite-only and approval-gated challenges',
    ],
    showcase: <ParticipantShowcase />,
  },
  {
    id: 'content',
    nav: 'Daily content',
    eyebrow: 'Daily Content and Tasks',
    icon: <LayoutList className="h-5 w-5" />,
    title: 'Watch it, read it, then actually do it',
    lead: 'A day mixes teaching and action, so people leave having made something.',
    points: [
      'Video, images, downloads and rich text',
      'Checklists, assignments and reflections',
      'Discussion prompts that open into the feed',
      'Estimated time per day, so nobody is surprised',
    ],
    showcase: <ContentShowcase />,
  },
  {
    id: 'submissions',
    nav: 'Submissions',
    eyebrow: 'File Submissions',
    icon: <Upload className="h-5 w-5" />,
    title: 'Work comes back, and you can answer it',
    lead: 'Written answers and reflections, reviewable one by one, with feedback that reaches them by email.',
    points: [
      'One submission per step, editable until reviewed',
      'Marked private stays private — withheld on the server',
      'Leave feedback; the participant is emailed once per review',
      'Reviewing private work needs its own permission',
    ],
    caveat:
      'File uploads are still in progress — the storage provider is not chosen yet. Everything above works with written submissions today.',
    showcase: <SubmissionsShowcase />,
  },
  {
    id: 'feed',
    nav: 'Community',
    eyebrow: 'Community Feed',
    icon: <Users className="h-5 w-5" />,
    title: 'The conversation sits beside the work',
    lead: 'A feed that belongs to the challenge — not a Facebook Group where an algorithm decides who reads what.',
    points: [
      'One feed per challenge',
      'Posts can be tied to the day they are about',
      'Only participants can see it',
      'Moderation hides rather than deletes, so removals stay auditable',
    ],
    showcase: <FeedShowcase />,
  },
  {
    id: 'reactions',
    nav: 'Reactions',
    eyebrow: 'Comments and Reactions',
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Small signals keep people going',
    lead: 'Five reactions and a reply are usually the difference between finishing Day 3 and quietly stopping.',
    points: [
      'Five reactions, one tap, tap again to take it back',
      'Threaded comments under any post',
      'Facilitators are marked, so guidance reads as guidance',
      'Rate limited, so no script can flood a feed',
    ],
    showcase: <ReactionsShowcase />,
  },
  {
    id: 'points',
    nav: 'Points',
    eyebrow: 'Points and Streaks',
    icon: <Flame className="h-5 w-5" />,
    title: 'Momentum you can watch go up',
    lead: 'Points for the work, streaks for showing up, and a cap so volume cannot beat effort.',
    points: [
      'Points for completing steps and taking part',
      'Streaks counted from real submissions',
      'Daily caps on community points',
      'An append-only ledger — nothing is ever awarded twice',
    ],
    showcase: <PointsShowcase />,
  },
  {
    id: 'badges',
    nav: 'Badges',
    eyebrow: 'Badges and Leaderboards',
    icon: <Trophy className="h-5 w-5" />,
    title: 'Mark the moments worth marking',
    lead: 'First step, halfway, a week-long streak, finishing. Earned once, kept forever.',
    points: [
      'Badges at progress and community milestones',
      'Awarded automatically as it happens',
      'Leaderboard optional — off by default',
      'Ranked on points, not on who posts most',
    ],
    showcase: <BadgesShowcase />,
  },
  {
    id: 'communications',
    nav: 'Email',
    eyebrow: 'Notifications and Communication',
    icon: <Mail className="h-5 w-5" />,
    title: 'The follow-up that usually never happens',
    lead: 'Ten moments worth an email, each one editable or switched off per challenge.',
    points: [
      'Confirmations, day-open nudges, quiet-participant check-ins',
      'Edit the subject and body, or turn it off entirely',
      'Every send logged — including skips and failures',
      'Per-workspace unsubscribe, honoured everywhere',
    ],
    showcase: <CommsShowcase />,
  },
  {
    id: 'sessions',
    nav: 'Live sessions',
    eyebrow: 'Live Sessions',
    icon: <Radio className="h-5 w-5" />,
    title: 'The calls that make it feel real',
    lead: 'Schedule them, put them in the hub, and let people save them to a calendar they actually use.',
    points: [
      'Join links before, replay links after',
      'A real .ics file, not a date in a paragraph',
      'Listed in the participant hub with the next one first',
      'Reminder email on its own trigger',
    ],
    showcase: <SessionsShowcase />,
  },
  {
    id: 'offer',
    nav: 'Offers',
    eyebrow: 'Offers and Calls to Action',
    icon: <Megaphone className="h-5 w-5" />,
    title: 'Finishing is the best moment to ask',
    lead: 'A closing page for the people who did the work, with the clicks counted.',
    points: [
      'Headline, body, bonuses and one call to action',
      'Shown after completion, or on a date you choose',
      'Clicks counted per challenge',
      'Your link, your checkout — no cut taken',
    ],
    showcase: <OfferShowcase />,
  },
  {
    id: 'analytics',
    nav: 'Analytics',
    eyebrow: 'Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Which day lost them, and who to call',
    lead: 'Registrations flatter everyone. Completion tells you whether it worked.',
    points: [
      'Day-by-day reach and completion per step',
      'Per-participant view: progress, points, streak, badges, emails',
      'At-risk list — quiet for three days or more, by name',
      'CSV export, permission-checked and logged, carrying no submission text',
    ],
    showcase: <AnalyticsShowcase />,
  },
]

const NAV: NavItem[] = CATEGORIES.map((c) => ({ id: c.id, label: c.nav }))

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-mesh">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-[0.3]" />
        <div className="relative mx-auto max-w-3xl px-6 pb-14 pt-16 text-center sm:pt-20">
          <Badge
            variant="secondary"
            className="mb-6 animate-fade-up border border-border/60 bg-background/80 px-4 py-1.5 text-sm font-medium backdrop-blur"
          >
            Thirteen things a challenge needs
          </Badge>
          <h1 className="animate-fade-up delay-1 text-[40px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Everything in one place,{' '}
            <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
              because a challenge needs all of it
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-up delay-2 text-lg leading-relaxed text-muted-foreground">
            Stitching this together from six tools is the reason most challenges
            never launch.
          </p>
        </div>
      </section>

      {/* Sticky category bar */}
      <FeatureNav items={NAV} />

      {/* The thirteen */}
      <div className="divide-y divide-border/60">
        {CATEGORIES.map((c, i) => {
          const flipped = i % 2 === 1
          return (
            <section
              key={c.id}
              id={c.id}
              className={cn('scroll-mt-32 py-16 sm:py-20', i % 2 === 1 && 'bg-muted/25')}
            >
              <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
                  {/* Copy */}
                  <div className={cn(flipped && 'lg:order-2')}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {c.icon}
                      </span>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {c.eyebrow}
                      </p>
                    </div>

                    <h2 className="mt-5 text-[27px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
                      {c.title}
                    </h2>
                    <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
                      {c.lead}
                    </p>

                    <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
                      {c.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-background p-3"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-[13px] leading-snug text-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>

                    {c.caveat && (
                      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-[13px] leading-relaxed text-amber-900">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        {c.caveat}
                      </p>
                    )}
                  </div>

                  {/* Showcase */}
                  <div aria-hidden="true" className={cn(flipped && 'lg:order-1')}>
                    {c.showcase}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>

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
            Easier to try than to read about
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-primary-foreground/90">
            The builder is free and nothing goes live until you publish it.
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
              <Link href="/use-cases">See who it is for</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
