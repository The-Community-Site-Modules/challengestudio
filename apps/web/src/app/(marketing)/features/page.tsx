// Route: /features
//
// Thirteen categories, grouped into five sections by the job each one does:
// build, shape, run, together, measure.
//
// The sticky category bar that used to sit under the hero is gone with the
// thirteen separate sections it indexed. Five headings and the summary row in
// the hero do that job now; if the page grows back past what a reader can hold
// in their head, `_components/feature-nav.tsx` is still there.
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


// ─── How the thirteen are grouped on the page ────────────────────────────────

/**
 * Five themed sections rather than thirteen alternating ones.
 *
 * The categories are unchanged — same copy, same showcases — but a reader
 * scrolling thirteen near-identical left/right blocks has no sense of where
 * they are in the argument. Grouped by the job being done, the page says
 * build, shape, run, together, measure, and each section's heading carries it.
 *
 * The first member of a group is the one whose showcase anchors the section;
 * the rest render as compact cards beside it.
 */
interface Group {
  id: string
  eyebrow: string
  title: string
  intro: string
  /** Category ids, lead first. */
  members: string[]
  tone: 'plain' | 'muted' | 'dark'
}

const GROUPS: Group[] = [
  {
    id: 'build',
    eyebrow: 'Before it starts',
    title: 'Design the days before anyone arrives',
    intro:
      'Assemble each day from blocks, decide what has to be done, and see the whole thing before a single person registers.',
    members: ['builder', 'content', 'submissions'],
    tone: 'plain',
  },
  {
    id: 'shape',
    eyebrow: 'One engine',
    title: 'Cohort, evergreen, or somewhere in between',
    intro: 'The shape is a setting, not a product. Change it after you have built the days.',
    members: ['scheduling'],
    tone: 'muted',
  },
  {
    id: 'run',
    eyebrow: 'While it runs',
    title: 'It carries itself once it starts',
    intro:
      'Days open on their own clock, the emails go out on schedule, and the live calls have a place to live. You show up to lead, not to operate.',
    members: ['participant', 'communications', 'sessions'],
    tone: 'plain',
  },
  {
    id: 'together',
    eyebrow: 'Together',
    title: 'People finish what other people can see',
    intro:
      'The feed sits beside the work rather than a tab away, and the rewards are for doing it rather than for posting about it.',
    members: ['feed', 'reactions', 'points', 'badges'],
    tone: 'dark',
  },
  {
    id: 'measure',
    eyebrow: 'Afterwards',
    title: 'See what happened, then make the next move',
    intro:
      'Completion counted from the records that produced it, and the one moment someone is most likely to say yes to what comes next.',
    members: ['analytics', 'offer'],
    tone: 'plain',
  },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

/** The four jobs, counted from the groups so the numbers cannot drift. */
const HERO_CARDS = GROUPS.filter((g) => g.id !== 'shape').map((g) => ({
  id: g.id,
  label: g.eyebrow,
  title: g.title,
  count: g.members.length,
}))

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mesh">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-[0.3]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
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

          {/* The four jobs. Anchors rather than tabs: moving the reader down the
              page is the only thing a summary row up here can honestly do. */}
          <ul className="mx-auto mt-12 grid max-w-5xl animate-fade-up delay-3 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HERO_CARDS.map((card, i) => (
              <li key={card.id}>
                <a
                  href={`#${card.id}`}
                  className={cn(
                    'flex h-full flex-col rounded-xl border p-4 transition-colors',
                    i === 0
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 bg-background/80 backdrop-blur hover:border-primary/40'
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-[0.12em]',
                      i === 0 ? 'text-primary-foreground/75' : 'text-primary'
                    )}
                  >
                    {card.label}
                  </span>
                  <span className="mt-2 block flex-1 text-[15px] font-semibold leading-snug">
                    {card.title}
                  </span>
                  <span
                    className={cn(
                      'mt-3 text-xs',
                      i === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {card.count} {card.count === 1 ? 'feature' : 'features'}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The five groups ──────────────────────────────────────────── */}
      {GROUPS.map((group) => {
        const members = group.members.flatMap((id) => {
          const c = BY_ID.get(id)
          return c ? [c] : []
        })
        const [lead, ...rest] = members
        if (!lead) return null
        const dark = group.tone === 'dark'

        return (
          <section
            key={group.id}
            id={group.id}
            className={cn(
              'scroll-mt-20 border-t border-border/60 py-20',
              group.tone === 'muted' && 'bg-muted/25',
              dark && 'border-slate-800 bg-slate-900 text-slate-50'
            )}
          >
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
                <div>
                  <p
                    className={cn(
                      'text-xs font-semibold uppercase tracking-[0.14em]',
                      dark ? 'text-indigo-300' : 'text-primary'
                    )}
                  >
                    {group.eyebrow}
                  </p>
                  <h2
                    className={cn(
                      'mt-3 text-3xl font-bold tracking-tight sm:text-4xl',
                      dark ? 'text-slate-50' : 'text-foreground'
                    )}
                  >
                    {group.title}
                  </h2>
                </div>
                <p
                  className={cn(
                    'leading-relaxed lg:pb-1',
                    dark ? 'text-slate-300' : 'text-muted-foreground'
                  )}
                >
                  {group.intro}
                </p>
              </div>

              <div className="mt-12 grid gap-5 lg:grid-cols-3">
                {/* The lead category, with its showcase. */}
                <div
                  className={cn(
                    'rounded-2xl border p-6 lg:col-span-2',
                    dark ? 'border-slate-800 bg-slate-950/40' : 'border-border/70 bg-background'
                  )}
                >
                  <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                    <div>
                      <span
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl',
                          dark ? 'bg-white/10 text-indigo-200' : 'bg-primary/10 text-primary'
                        )}
                      >
                        {lead.icon}
                      </span>
                      <h3
                        className={cn(
                          'mt-4 text-lg font-semibold',
                          dark ? 'text-slate-50' : 'text-foreground'
                        )}
                      >
                        {lead.title}
                      </h3>
                      <p
                        className={cn(
                          'mt-2 text-sm leading-relaxed',
                          dark ? 'text-slate-300' : 'text-muted-foreground'
                        )}
                      >
                        {lead.lead}
                      </p>
                      <ul className="mt-4 space-y-2">
                        {lead.points.slice(0, 3).map((p) => (
                          <li key={p} className="flex gap-2.5 text-sm">
                            <CheckCircle2
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0',
                                dark ? 'text-indigo-300' : 'text-primary'
                              )}
                              aria-hidden="true"
                            />
                            <span className={dark ? 'text-slate-300' : 'text-muted-foreground'}>{p}</span>
                          </li>
                        ))}
                      </ul>
                      {lead.caveat && (
                        <p
                          className={cn(
                            'mt-4 flex gap-2 text-xs',
                            dark ? 'text-slate-400' : 'text-muted-foreground'
                          )}
                        >
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {lead.caveat}
                        </p>
                      )}
                    </div>
                    <div aria-hidden="true">{lead.showcase}</div>
                  </div>
                </div>

                {/* The rest of the group, compact. */}
                {rest.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'rounded-2xl border p-6',
                      dark ? 'border-slate-800 bg-slate-950/40' : 'border-border/70 bg-background'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        dark ? 'bg-white/10 text-indigo-200' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {c.icon}
                    </span>
                    <h3
                      className={cn(
                        'mt-4 text-lg font-semibold',
                        dark ? 'text-slate-50' : 'text-foreground'
                      )}
                    >
                      {c.title}
                    </h3>
                    <p
                      className={cn(
                        'mt-2 text-sm leading-relaxed',
                        dark ? 'text-slate-300' : 'text-muted-foreground'
                      )}
                    >
                      {c.lead}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {c.points.slice(0, 3).map((p) => (
                        <li key={p} className="flex gap-2.5 text-sm">
                          <CheckCircle2
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0',
                              dark ? 'text-indigo-300' : 'text-primary'
                            )}
                            aria-hidden="true"
                          />
                          <span className={dark ? 'text-slate-300' : 'text-muted-foreground'}>{p}</span>
                        </li>
                      ))}
                    </ul>
                    {c.caveat && (
                      <p
                        className={cn(
                          'mt-4 flex gap-2 text-xs',
                          dark ? 'text-slate-400' : 'text-muted-foreground'
                        )}
                      >
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {c.caveat}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      {/* ── One place instead of six tabs ────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/25 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              One place instead of six tabs
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Course tool, email tool, community, spreadsheet, scheduler — every piece
              here already knows about the others.
            </p>
          </div>
          <Button size="lg" variant="outline" className="shrink-0 gap-2" asChild>
            <Link href="/pricing">
              See pricing <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
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
                Create a challenge <ArrowRight className="ml-2 h-4 w-4" />
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
