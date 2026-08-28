// Route: /features
//
// Was a five-line "Coming soon" stub. Everything below describes something
// that is actually built and can be opened in the product today — the
// milestone-by-milestone work, written for someone deciding whether to sign
// up rather than for the build plan. Nothing here is aspirational; if a claim
// could not be demonstrated in a live workspace, it is not on this page.

import Link from 'next/link'
import {
  ArrowRight, Blocks, Users, Trophy, BarChart3, Mail, CalendarClock,
  Radio, ShieldCheck, Smartphone, Lock, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Features — Challenge Studio',
  description:
    'Everything a challenge needs: a content builder, scheduled unlocking, community, gamification, automated email, live sessions and analytics.',
}

const groups = [
  {
    icon: <Blocks className="h-6 w-6" />,
    title: 'A builder, not a page editor',
    body: 'Each day is assembled from content blocks — headings, video, downloads, checklists, assignments, reflections and discussion prompts. A block can be required, which is what makes completion mean something rather than being a button somebody pressed.',
    points: [
      'Ten block types, reorderable, per day',
      'Required blocks gate completion',
      'Draft and publish per step, not only per challenge',
      'A publish gate that refuses an empty challenge',
    ],
  },
  {
    icon: <CalendarClock className="h-6 w-6" />,
    title: 'Timing that fits the challenge',
    body: 'One engine, several shapes. A cohort starts together on fixed dates; an evergreen challenge gives each person their own Day 1 from the moment they join. Days unlock at local midnight in the challenge’s own timezone, so nobody in Karachi gets Day 3 while it is still Day 2 in New York.',
    points: [
      'Cohort, evergreen, self-paced, sprint, drip and live-event modes',
      'Any length — 3 days, 30 days, 365, or milestone-based',
      'Scheduled release per step, down to the hour',
      'Daylight saving handled: local midnight stays local midnight',
    ],
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Community, without a Facebook Group',
    body: 'A feed that belongs to the challenge itself, so the conversation sits beside the work instead of somewhere else entirely. Posts, comments and reactions, with moderation for the people running it.',
    points: [
      'Per-challenge feed, comments and reactions',
      'Moderation hides rather than deletes, so removals stay auditable',
      'Private reflections stay private — participants never see them',
      'Rate limits on posting, so a runaway script cannot flood a feed',
    ],
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: 'Momentum people can see',
    body: 'Points for completing steps and taking part, streaks for consecutive days, and badges at the moments worth marking. Daily caps mean posting twenty times in an evening does not out-earn doing the challenge.',
    points: [
      'Points ledger that is append-only and cannot double-award',
      'Streaks counted from real submissions',
      'Badges at first step, halfway, finishing, and community milestones',
      'Optional leaderboard — off by default',
    ],
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: 'Email that runs itself',
    body: 'Registration confirmations, day-open nudges, encouragement when somebody goes quiet, and feedback notifications. Each message type can be edited or switched off per challenge, and every send is logged.',
    points: [
      'Ten triggers, each editable per challenge',
      'Delivery log records sends, skips and failures alike',
      'A message is never sent twice, enforced by the database',
      'Per-workspace unsubscribe, honoured everywhere',
    ],
  },
  {
    icon: <Radio className="h-6 w-6" />,
    title: 'Live sessions and the offer',
    body: 'Schedule calls with join and replay links, and add them to a participant’s calendar. When a challenge ends, a configurable offer page turns finishers into the next step — with clicks counted.',
    points: [
      'Sessions listed in the hub, with an .ics download',
      'Replay links after the fact',
      'Post-challenge offer page with headline, bonuses and a call to action',
      'Offer clicks counted per challenge',
    ],
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics counted, not estimated',
    body: 'Registrations, activation, completion rate, average steps, submission rate, community participation, offer clicks and a day-by-day curve — every one derived from the records that produced it. The at-risk list names who has gone quiet, so a nudge can be personal.',
    points: [
      'Day-by-day reach and completion per step',
      'Per-participant view: progress, points, streak, badges, emails sent',
      'At-risk list of people quiet for three days or more',
      'CSV export, permission-checked and logged',
    ],
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Built to keep tenants apart',
    body: 'Workspaces are separated at every query, and separation is tested rather than assumed — including through a browser, as one signed-in customer trying to reach another’s data.',
    points: [
      'Capability-based roles: owner, admin, member',
      'Private submissions withheld on the server, not hidden in the page',
      'Exports carry counts and dates — never submission text',
      'Rate limits on registration and sign-in attempts',
    ],
  },
]

const smaller = [
  { icon: <Smartphone className="h-5 w-5" />, title: 'Mobile first', body: 'Participants do this on a phone, in a spare ten minutes. The daily page is built for that, not shrunk to fit it.' },
  { icon: <Lock className="h-5 w-5" />,       title: 'Private and approval-gated challenges', body: 'Invite-only, or a waiting room where you decide who gets in.' },
  { icon: <Layers className="h-5 w-5" />,     title: 'Multiple workspaces', body: 'Run separate brands or clients side by side, each with its own team and challenges.' },
]

export default function FeaturesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Everything a challenge needs,{' '}
            <span className="text-primary">in one place</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A landing page, an email tool, a group, a spreadsheet, a calendar and a
            course platform — replaced by one thing that understands what a
            challenge actually is.
          </p>
        </div>
      </section>

      {/* The eight groups */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {groups.map((g) => (
              <Card key={g.title} className="border-border/60">
                <CardContent className="p-7">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {g.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{g.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
                  <ul className="mt-4 space-y-2">
                    {g.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span
                          aria-hidden="true"
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* The smaller things */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {smaller.map((s) => (
              <div key={s.title} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {s.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Build one and see
          </h2>
          <p className="mt-4 text-primary-foreground/90">
            The builder is free to use. You only publish when it looks right.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base" asChild>
              <Link href="/auth/signup">
                Start building <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-primary-foreground/30 bg-transparent px-8 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
