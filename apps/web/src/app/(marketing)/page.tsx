import Link from 'next/link'
import { ArrowRight, CheckCircle, Users, Zap, Trophy, BarChart3, Heart, Building2, BookOpen, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// ─── Feature data ─────────────────────────────────────────────────────────
const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Any challenge type',
    description: 'Marketing launches, evergreen journeys, paid programs, cohort experiences, team challenges — one engine handles all.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Community built-in',
    description: 'Dedicated challenge feed, comments, reactions, and facilitator tools keep participants connected and accountable.',
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: 'Gamification that motivates',
    description: 'Points, streaks, milestone badges, and optional leaderboards turn daily action into visible momentum.',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: 'Analytics that matter',
    description: 'Track registrations, activation, day-by-day completion, offer clicks, and at-risk participants in one dashboard.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Powerful content builder',
    description: 'Build daily experiences from rich content blocks — video, downloads, assignments, reflections, and more.',
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: 'Mobile-first experience',
    description: "Participants complete daily challenges on any device. The experience is designed for phones, not just desktops.",
  },
]

const useCases = [
  { icon: <Mic className="h-5 w-5" />,       label: 'Coaches & Consultants',  desc: '5-day launches, onboarding sprints, 30-day journeys' },
  { icon: <BookOpen className="h-5 w-5" />,   label: 'Authors',                desc: 'Book launch challenges, writing sprints, reading journeys' },
  { icon: <Users className="h-5 w-5" />,      label: 'Community Owners',       desc: 'Monthly engagement, member onboarding, habit campaigns' },
  { icon: <Building2 className="h-5 w-5" />,  label: 'Businesses & Teams',     desc: 'Sales sprints, culture challenges, wellness initiatives' },
  { icon: <Heart className="h-5 w-5" />,      label: 'Wellness Leaders',        desc: 'Movement, nutrition, mindfulness, habit tracking' },
  { icon: <Zap className="h-5 w-5" />,        label: 'Course Creators',         desc: 'Pre-course activation, implementation sprints, graduation' },
]

const steps = [
  { step: '01', title: 'Build your challenge', desc: 'Use the guided wizard to set your promise, design daily experiences, and configure your audience.' },
  { step: '02', title: 'Publish & promote', desc: 'Get a branded registration page with a shareable URL. Participants register in seconds.' },
  { step: '03', title: 'Guide the journey', desc: 'Automated emails, live sessions, community, and gamification keep participants engaged every day.' },
  { step: '04', title: 'Celebrate & convert', desc: 'Completion celebrations, badges, and a post-challenge offer turn finishers into customers.' },
]

const testimonials = [
  {
    quote: "We replaced our Facebook Group and email sequence with Challenge Studio. Our completion rate went from 12% to 61%.",
    author: 'Sarah K.',
    role: 'Business Coach',
  },
  {
    quote: "Running a 30-day wellness challenge used to take a team of three. Now I do it solo in an afternoon.",
    author: 'Marcus T.',
    role: 'Fitness Creator',
  },
  {
    quote: "The gamification alone transformed our community engagement. Members are actually showing up every day.",
    author: 'Priya M.',
    role: 'Community Builder',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            Now in Beta — Free to get started
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Build a challenge.{' '}
            <span className="text-primary">Guide a transformation.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Challenge Studio is the complete platform for creating 5-day launches, paid journeys,
            evergreen programs, and community challenges — without stitching together ten different tools.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/auth/signup">
                Start building free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/examples">See example challenges</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Launch your first challenge in under an hour.
          </p>

          {/* Social proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {['No Facebook Group needed', 'Mobile-first experience', 'Built-in gamification', 'Analytics dashboard'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Hero UI mockup */}
        <div className="mx-auto max-w-5xl px-6 pb-8">
          <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">
            <div className="flex items-center gap-1.5 bg-muted/80 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-muted-foreground">challengestudio.com/c/5-day-launch</span>
            </div>
            <div className="bg-card p-8">
              <div className="flex gap-6">
                {/* Sidebar mock */}
                <div className="hidden w-48 shrink-0 space-y-1 md:block">
                  {['Overview', 'Builder', 'Participants', 'Community', 'Analytics'].map((item, i) => (
                    <div key={item} className={`rounded-md px-3 py-2 text-sm ${i === 1 ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground'}`}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Main mock */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-6 w-48 rounded-md bg-foreground/10" />
                      <div className="mt-1 h-4 w-32 rounded-md bg-muted" />
                    </div>
                    <div className="h-9 w-28 rounded-md bg-primary/80" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['247 Registered', '61% Active', '38% Complete'].map((s) => (
                      <div key={s} className="rounded-lg border border-border bg-background p-3">
                        <div className="text-xs text-muted-foreground">{s.split(' ')[1]}</div>
                        <div className="mt-0.5 text-xl font-bold text-foreground">{s.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[100, 95, 82, 74, 61].map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-10 text-right text-xs text-muted-foreground">Day {i + 1}</span>
                        <div className="flex-1 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${w}%` }} />
                        </div>
                        <span className="w-8 text-xs text-muted-foreground">{w}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From idea to launched — fast
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything you need to run a professional challenge, in one place.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-extrabold text-primary">
                  {s.step}
                </div>
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything a challenge needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              Replace the patchwork of tools with one focused platform.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for every type of creator
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.label} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {u.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{u.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Creators are seeing results
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.author} className="border-border/60">
                <CardContent className="p-6">
                  <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-foreground">{t.author}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
            Ready to launch your first challenge?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join creators who are turning ideas into transformational experiences.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base" asChild>
              <Link href="/auth/signup">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">Challenge Studio</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/features" className="hover:text-foreground">Features</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 Smartstack Platforms LLC</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
