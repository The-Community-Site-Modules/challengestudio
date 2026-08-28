// Route: /use-cases
//
// This route did not exist. The nav linked to it and it returned 404.
//
// The audiences and their representative uses come from PRD §4, and the modes
// from §6 — so the page describes the product that was actually specified
// rather than a set of personas invented for a marketing page.

import Link from 'next/link'
import {
  ArrowRight, Mic, BookOpen, Presentation, GraduationCap, Users,
  HeartPulse, Church, Building2, Briefcase, HandHeart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Use Cases — Challenge Studio',
  description:
    'Coaches, authors, speakers, course creators, communities, wellness leaders, churches, teams, agencies and nonprofits — what each of them runs.',
}

const audiences = [
  {
    icon: <Mic className="h-6 w-6" />,
    who: 'Coaches and consultants',
    runs: ['A 5-day launch challenge', 'A client onboarding sprint', 'A 30-day implementation journey'],
    value: 'Turns a lead magnet into a week of real contact. People who finish a challenge with you have already worked with you.',
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    who: 'Authors',
    runs: ['A book launch challenge', 'A guided reading journey', 'A writing sprint'],
    value: 'Readers move from buying the book to using it — and they do it together, where you can see it.',
  },
  {
    icon: <Presentation className="h-6 w-6" />,
    who: 'Speakers and thought leaders',
    runs: ['An idea activation challenge', 'An action week after a keynote', 'Event follow-up'],
    value: 'The talk ends and the momentum usually ends with it. A challenge is where the applause becomes action.',
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    who: 'Course and program leaders',
    runs: ['A pre-course activation challenge', 'An implementation sprint', 'A graduation journey'],
    value: 'Courses are bought and abandoned. A challenge is short enough to finish, which is what makes the course get used.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    who: 'Community owners',
    runs: ['Monthly engagement campaigns', 'New member onboarding', 'Habit challenges'],
    value: 'Gives a quiet community something to do together, on a schedule, with progress everyone can see.',
  },
  {
    icon: <HeartPulse className="h-6 w-6" />,
    who: 'Fitness and wellness leaders',
    runs: ['Movement and nutrition challenges', 'Mindfulness practices', 'Wellness campaigns'],
    value: 'Streaks and check-ins are the whole point here, and they are built in rather than tracked in a spreadsheet.',
  },
  {
    icon: <Church className="h-6 w-6" />,
    who: 'Ministries and churches',
    runs: ['Prayer and scripture challenges', 'Service and generosity campaigns'],
    value: 'A shared practice with room for testimony — and private reflections that stay private.',
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    who: 'Businesses and teams',
    runs: ['A sales sprint', 'A culture challenge', 'A wellness initiative'],
    value: 'Participation you can measure, without asking anyone to install something new.',
  },
  {
    icon: <Briefcase className="h-6 w-6" />,
    who: 'Agencies',
    runs: ['Challenge campaigns built and run for clients'],
    value: 'A separate workspace per client, each with its own team, challenges and analytics.',
  },
  {
    icon: <HandHeart className="h-6 w-6" />,
    who: 'Local organisations and nonprofits',
    runs: ['Fundraising and volunteer drives', 'Awareness campaigns', 'Local passport challenges'],
    value: 'Public participation with a visible finish line, which is what mobilises people.',
  },
]

const modes = [
  { name: 'Marketing challenge', how: 'A public registration campaign with scheduled content, community, live sessions and a final offer.', when: 'A 5-day lead-generation launch.' },
  { name: 'Evergreen challenge',  how: 'Each participant starts the moment they join and moves at their own pace.', when: 'A lead magnet, or a self-paced transformation.' },
  { name: 'Cohort challenge',     how: 'A defined group starts and finishes together on shared dates.', when: 'A launch, mastermind, workshop, school or church group.' },
  { name: 'Internal challenge',   how: 'Restricted to members of an existing community or organisation.', when: 'Engagement and retention inside a group you already have.' },
  { name: 'Paid challenge',       how: 'Enrolment requires a purchase or an entitlement granted elsewhere.', when: 'A low-ticket product, or a premium experience.' },
  { name: 'Habit challenge',      how: 'Repeated activity with check-ins, streaks and optional measurements.', when: 'Wellness, writing, prayer, sales.' },
  { name: 'Milestone journey',    how: 'Steps in order, not necessarily tied to calendar days.', when: 'Onboarding, or an implementation roadmap.' },
]

export default function UseCasesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            One engine.{' '}
            <span className="text-primary">Many kinds of challenge.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A prayer challenge and a sales sprint look nothing alike to the people
            doing them, and are the same thing underneath: a promise, a schedule,
            daily steps, and somebody keeping everyone moving.
          </p>
        </div>
      </section>

      {/* Who */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((a) => (
              <Card key={a.who} className="border-border/60">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {a.icon}
                  </div>
                  <h2 className="text-base font-semibold text-foreground">{a.who}</h2>
                  <ul className="mt-3 space-y-1.5">
                    {a.runs.map((run) => (
                      <li key={run} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span
                          aria-hidden="true"
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                        {run}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                    {a.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modes */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pick the shape, not the product
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              These are settings on one challenge, not separate tools to learn.
              You can change your mind after building it.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {modes.map((m) => (
                <li key={m.name} className="grid gap-2 p-5 sm:grid-cols-[200px_1fr] sm:gap-6 sm:p-6">
                  <p className="font-semibold text-foreground">{m.name}</p>
                  <div>
                    <p className="text-sm text-foreground">{m.how}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{m.when}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Duration */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            However long it needs to be
          </h2>
          <p className="mt-4 text-muted-foreground">
            Three days, five, seven, twenty-one, thirty, ninety, a year, or a set
            of milestones with no calendar at all. Nothing here assumes the usual
            five days — including rest days and catch-up days, if the challenge
            wants them.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {['3 days', '5 days', '7 days', '21 days', '30 days', '90 days', '365 days', 'Milestones'].map((d) => (
              <span
                key={d}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Yours probably fits
          </h2>
          <p className="mt-4 text-primary-foreground/90">
            And if it does not, building one is the fastest way to find out.
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
              <Link href="/features">See what is included</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
