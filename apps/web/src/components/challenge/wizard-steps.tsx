'use client'

import { useState } from 'react'
import {
  Target,
  CheckCircle, Globe, Lock, UserCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { StepNav, useWizardPublish } from './wizard-shell'
import { useWizard } from '@/app/(workspace)/ws/[workspaceSlug]/challenges/new/_context/wizard-context'

// ─── Shared section wrapper ───────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <Separator />
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

// ─── Step 1: Foundation ───────────────────────────────────────────────────
export function Step1Foundation({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const { data, update } = useWizard()

  return (
    <Section title="Foundation" description="Name your challenge and set the basics.">
      <Field label="Challenge title" hint="What participants will see publicly.">
        <Input
          placeholder="e.g. 5-Day Business Launch Challenge"
          value={data.title}
          onChange={e => update({ title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,60) })}
        />
      </Field>
      <Field label="URL slug" hint="Your challenge will be at /c/[slug]">
        <div className="flex items-center gap-0">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            /c/
          </span>
          <Input
            className="rounded-l-none"
            placeholder="5-day-launch"
            value={data.slug}
            onChange={e => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') })}
          />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select value={data.category} onValueChange={v => update({ category: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {['Business', 'Wellness', 'Fitness', 'Finance', 'Relationships', 'Faith', 'Writing', 'Other'].map(c => (
                <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Short description" hint="1–2 sentences shown on registration pages.">
        <Textarea
          placeholder="A focused 5-day experience that helps entrepreneurs..."
          rows={3}
          value={data.description}
          onChange={e => update({ description: e.target.value })}
        />
      </Field>
      <StepNav step={step} setStep={setStep} canNext={!!data.title} />
    </Section>
  )
}

// ─── Step 2: Outcome ─────────────────────────────────────────────────────
export function Step2Outcome({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  return (
    <Section
      title="Outcome"
      description="Define the transformation your challenge delivers."
    >
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex gap-3">
        <Target className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <p className="text-sm text-foreground">
          A great challenge has a clear starting point and a compelling destination.
          Fill these in carefully — they power your registration page and participant experience.
        </p>
      </div>
      <Field label="Participant starting point" hint="Where are they when they sign up? What's the pain or gap?">
        <Textarea placeholder="e.g. Stuck with a business idea but no clients and no clear plan to get started." rows={3} />
      </Field>
      <Field label="Desired outcome" hint="Where will they be after completing your challenge?">
        <Textarea placeholder="e.g. Has landed their first paying client and a repeatable outreach process." rows={3} />
      </Field>
      <Field label="The promise (one line)" hint="Your headline promise — be specific and bold.">
        <Input placeholder="e.g. Go from idea to your first paying client in 5 days." />
      </Field>
      <Field label="Success definition" hint="How will you and participants know they've succeeded?">
        <Textarea placeholder="e.g. Completed all 5 days, submitted their outreach plan, and made at least one offer." rows={3} />
      </Field>
      <Field label="Expected daily time commitment">
        <Select>
          <SelectTrigger><SelectValue placeholder="Select commitment" /></SelectTrigger>
          <SelectContent>
            {['15 minutes', '30 minutes', '45 minutes', '1 hour', '1–2 hours', '2+ hours'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 3: Mode ────────────────────────────────────────────────────────
const MODES = [
  { id: 'marketing',  label: 'Marketing Challenge',  desc: '5-day lead-generation launch with public registration and a final offer.' },
  { id: 'cohort',     label: 'Cohort Challenge',     desc: 'A defined group starts and progresses together on shared dates.' },
  { id: 'evergreen',  label: 'Evergreen Challenge',  desc: 'Each participant begins on their own schedule — great for lead magnets.' },
  { id: 'paid',       label: 'Paid Challenge',       desc: 'Enrollment requires purchase or externally granted access.' },
  { id: 'internal',   label: 'Internal / Community', desc: 'Restricted to members of an existing community or organisation.' },
  { id: 'team',       label: 'Team Challenge',       desc: 'Participants belong to teams with shared scoring and progress.' },
  { id: 'habit',      label: 'Habit Challenge',      desc: 'Repeated daily activity with check-ins, streaks, and measurements.' },
  { id: 'milestone',  label: 'Milestone Journey',    desc: 'Sequential steps not necessarily tied to calendar days.' },
]

export function Step3Mode({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [selected, setSelected] = useState('marketing')
  return (
    <Section title="Challenge Mode" description="Choose how your challenge will run.">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={cn(
              'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
              selected === m.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{m.label}</span>
              {selected === m.id && <CheckCircle className="h-4 w-4 text-primary" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
          </button>
        ))}
      </div>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 4: Schedule ────────────────────────────────────────────────────
const TIMING_MODELS = [
  { id: 'fixed_calendar',   label: 'Fixed Calendar',       desc: 'All participants see the same active day.' },
  { id: 'rolling',          label: 'Rolling Enrollment',   desc: 'Each participant has their own Day 1.' },
  { id: 'open_access',      label: 'Open Access',          desc: 'All published days available immediately.' },
  { id: 'sequential',       label: 'Sequential Completion',desc: 'Next step unlocks after previous is completed.' },
]

export function Step4Schedule({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [timing, setTiming] = useState('fixed_calendar')
  return (
    <Section title="Schedule" description="Configure when your challenge runs and how content unlocks.">
      <Field label="Timezone">
        <Select>
          <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
          <SelectContent>
            {['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Australia/Sydney'].map(tz => (
              <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Registration opens">
          <Input type="date" />
        </Field>
        <Field label="Registration closes">
          <Input type="date" />
        </Field>
        <Field label="Challenge starts">
          <Input type="date" />
        </Field>
        <Field label="Challenge ends">
          <Input type="date" />
        </Field>
      </div>
      <Field label="Content unlock method" hint="How do participants access new days?">
        <div className="grid gap-2 sm:grid-cols-2">
          {TIMING_MODELS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTiming(t.id)}
              className={cn(
                'flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-all',
                timing === t.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <span className="font-medium text-foreground">{t.label}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Grace period" hint="Extra hours after midnight to complete the previous day.">
        <Select>
          <SelectTrigger><SelectValue placeholder="No grace period" /></SelectTrigger>
          <SelectContent>
            {['None', '2 hours', '4 hours', '8 hours', '12 hours', '24 hours'].map(g => (
              <SelectItem key={g} value={g.toLowerCase().replace(' ', '_')}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 5: Audience ────────────────────────────────────────────────────
export function Step5Audience({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [visibility, setVisibility] = useState<'public' | 'invite' | 'restricted'>('public')
  const [requiresApproval, setRequiresApproval] = useState(false)

  const options = [
    { id: 'public' as const,     icon: <Globe className="h-5 w-5" />,      label: 'Public',             desc: 'Anyone can register via the public page.' },
    { id: 'invite' as const,     icon: <UserCheck className="h-5 w-5" />,  label: 'Invite-only',        desc: 'Only people you invite can register.' },
    { id: 'restricted' as const, icon: <Lock className="h-5 w-5" />,       label: 'Membership-restricted', desc: 'Restricted to existing community members.' },
  ]

  return (
    <Section title="Audience" description="Control who can join your challenge.">
      <div className="grid gap-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setVisibility(o.id)}
            className={cn(
              'flex items-start gap-4 rounded-xl border p-4 text-left transition-all',
              visibility === o.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:border-primary/40'
            )}
          >
            <div className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              visibility === o.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {o.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
            {visibility === o.id && <CheckCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />}
          </button>
        ))}
      </div>
      <Field label="Capacity" hint="Maximum number of participants. Leave blank for unlimited.">
        <Input type="number" placeholder="Unlimited" />
      </Field>
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Require approval</p>
          <p className="text-xs text-muted-foreground">Manually approve each registration before granting access.</p>
        </div>
        <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
      </div>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 6: Experience ──────────────────────────────────────────────────
export function Step6Experience({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [features, setFeatures] = useState({
    liveSessions: true, community: true, submissions: true,
    gamification: true, leaderboard: false, reflections: true,
  })
  const toggle = (key: keyof typeof features) =>
    setFeatures((f) => ({ ...f, [key]: !f[key] }))

  const toggles = [
    { key: 'liveSessions' as const,  label: 'Live sessions',         desc: 'Add Zoom or YouTube live events per day.' },
    { key: 'community' as const,     label: 'Challenge feed',         desc: 'Dedicated social feed for participant posts.' },
    { key: 'submissions' as const,   label: 'Homework submissions',   desc: 'Collect text, files, or reflection responses.' },
    { key: 'gamification' as const,  label: 'Points & badges',        desc: 'Award XP for completed actions and milestones.' },
    { key: 'leaderboard' as const,   label: 'Leaderboard',            desc: 'Optional — show ranked participant progress.' },
    { key: 'reflections' as const,   label: 'Private reflections',    desc: 'Private journal prompts visible only to the participant.' },
  ]

  return (
    <Section title="Experience" description="Choose which features to enable for this challenge.">
      <Field label="Number of days / steps">
        <div className="flex items-center gap-3">
          <Input type="number" placeholder="5" className="w-28" />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </Field>
      <div className="space-y-3">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={features[t.key]} onCheckedChange={() => toggle(t.key)} />
          </div>
        ))}
      </div>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 7: Communications ──────────────────────────────────────────────
export function Step7Communications({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [emails, setEmails] = useState({
    registration: true, start: true, daily: true,
    reminder: true, inactivity: true, completion: true,
  })
  const toggle = (k: keyof typeof emails) => setEmails(e => ({ ...e, [k]: !e[k] }))

  const triggers = [
    { key: 'registration' as const, label: 'Registration confirmation', desc: 'Sent immediately after someone registers.' },
    { key: 'start' as const,        label: 'Challenge starting soon',   desc: 'Sent 24 hours before Day 1 unlocks.' },
    { key: 'daily' as const,        label: 'Day available',             desc: 'Notifies participants when a new day unlocks.' },
    { key: 'reminder' as const,     label: 'Live session reminder',     desc: 'Sent before each scheduled live session.' },
    { key: 'inactivity' as const,   label: 'Inactivity nudge',          desc: 'Sent after configured days without progress.' },
    { key: 'completion' as const,   label: 'Completion celebration',    desc: 'Sent when a participant finishes the challenge.' },
  ]

  return (
    <Section title="Communications" description="Control which automated emails participants receive.">
      <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm text-muted-foreground">
        Security emails (account setup, password reset) are always sent and cannot be disabled.
      </div>
      <div className="space-y-3">
        {triggers.map((t) => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch checked={emails[t.key]} onCheckedChange={() => toggle(t.key)} />
          </div>
        ))}
      </div>
      <Field label="Inactivity trigger (days without progress)">
        <Select>
          <SelectTrigger><SelectValue placeholder="2 days" /></SelectTrigger>
          <SelectContent>
            {['1 day', '2 days', '3 days', '5 days'].map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 8: Conversion ──────────────────────────────────────────────────
export function Step8Conversion({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const [hasOffer, setHasOffer] = useState(true)
  return (
    <Section title="Conversion" description="Configure the post-challenge offer shown to completers.">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enable post-challenge offer</p>
          <p className="text-xs text-muted-foreground">Show a CTA page after participants complete the challenge.</p>
        </div>
        <Switch checked={hasOffer} onCheckedChange={setHasOffer} />
      </div>

      {hasOffer && (
        <div className="space-y-4">
          <Field label="Offer headline">
            <Input placeholder="e.g. Ready to go deeper? Join the full program." />
          </Field>
          <Field label="CTA button text">
            <Input placeholder="e.g. Get instant access" />
          </Field>
          <Field label="Destination URL" hint="Your sales page, checkout, or Calendly link.">
            <Input type="url" placeholder="https://your-checkout.com/offer" />
          </Field>
          <Field label="Offer deadline" hint="Creates urgency. Leave blank for no deadline.">
            <Input type="datetime-local" />
          </Field>
          <Field label="Bonuses" hint="List any time-sensitive bonuses (one per line).">
            <Textarea placeholder="1:1 strategy call&#10;Private Slack access" rows={3} />
          </Field>
        </div>
      )}
      <StepNav step={step} setStep={setStep} />
    </Section>
  )
}

// ─── Step 9: Review & Publish ────────────────────────────────────────────
export function Step9Review({ step, setStep }: { step: number; setStep: (s: number) => void }) {
  const { data } = useWizard()
  const { onPublish, isPublishing } = useWizardPublish()

  const checks = [
    { label: 'Challenge title set',             done: !!data.title },
    { label: 'URL slug set',                    done: !!data.slug },
    { label: 'Promise and outcome defined',      done: !!data.promise },
    { label: 'Start date configured',            done: !!data.startsAt },
    { label: 'Mode selected',                    done: !!data.mode },
  ]
  const allDone = checks.every(c => c.done)

  return (
    <Section title="Review & Publish" description="Check everything before going live.">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: 'Title',    value: data.title    || '—' },
          { label: 'Mode',     value: data.mode     || '—' },
          { label: 'Starts',   value: data.startsAt ? new Date(data.startsAt).toLocaleDateString() : '—' },
          { label: 'Audience', value: data.visibility === 'public' ? 'Public' : 'Invite-only' },
          { label: 'Days',     value: data.numDays  || '—' },
          { label: 'Offer',    value: data.hasOffer ? 'Enabled' : 'Disabled' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Publish checklist</p>
        {checks.map((item) => (
          <div key={item.label} className={cn(
            'flex items-center gap-3 rounded-lg px-4 py-3 text-sm',
            item.done
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-muted/30 text-muted-foreground border border-border'
          )}>
            <CheckCircle className={cn('h-4 w-4 shrink-0', item.done ? 'text-green-500' : 'text-muted-foreground')} />
            {item.label}
            {!item.done && (
              <Badge variant="outline" className="ml-auto text-xs">Required</Badge>
            )}
          </div>
        ))}
      </div>

      {!allDone && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          Complete the required steps above before publishing. You can save as a draft and build steps in the builder.
        </div>
      )}

      <StepNav
        step={step}
        setStep={setStep}
        isLast
        canNext={allDone}
        nextLabel="Create challenge →"
        onPublish={onPublish}
        isPublishing={isPublishing}
      />
    </Section>
  )
}
