'use client'

import { Target, CheckCircle, Globe, Lock, UserCheck, AlertCircle } from 'lucide-react'
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
import {
  validateStep, incompleteSteps, STEP_LABELS,
  type FieldErrors,
} from '@/app/(workspace)/ws/[workspaceSlug]/challenges/new/_context/validation'

interface StepProps { step: number; setStep: (s: number) => void }

// ─── Shared ───────────────────────────────────────────────────────────────

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

/**
 * One labelled control.
 *
 * `name` doubles as the scroll target StepNav jumps to when Continue is pressed
 * with something missing, so it must match the key the validator reports.
 */
function Field({ name, label, hint, required, error, children }: {
  name: string
  label: string
  hint?: string
  required?: boolean
  error?: string | undefined
  children: React.ReactNode
}) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <div data-field={name} tabIndex={-1} className="space-y-1.5 outline-none">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {/* Separate variants per element: Tailwind's arbitrary-variant syntax does
          not take a comma-separated selector list. */}
      <div
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cn(error && '[&_input]:border-destructive [&_textarea]:border-destructive [&_button]:border-destructive')}
      >
        {children}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

/** Errors for this step, but only once Continue has been pressed on it. */
function useStepErrors(step: number) {
  const { data, attempted, markAttempted } = useWizard()
  const errors = validateStep(step, data)
  const shown: FieldErrors = attempted[step] ? errors : {}
  return { errors, shown, markAttempted }
}

// ─── Step 1: Foundation ───────────────────────────────────────────────────

export function Step1Foundation({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Foundation" description="Name your challenge and set the basics.">
      <Field name="title" label="Challenge title" required error={shown.title}
             hint="What participants will see publicly.">
        <Input
          placeholder="e.g. 5-Day Business Launch Challenge"
          value={data.title}
          onChange={(e) => update({
            title: e.target.value,
            slug: e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60),
          })}
        />
      </Field>

      <Field name="slug" label="URL slug" required error={shown.slug}
             hint="Your challenge will be at /c/[slug]">
        <div className="flex items-center gap-0">
          <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            /c/
          </span>
          <Input
            className="rounded-l-none"
            placeholder="5-day-launch"
            value={data.slug}
            onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          />
        </div>
      </Field>

      <Field name="category" label="Category">
        <Select value={data.category} onValueChange={(v) => update({ category: v })}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {['Business', 'Wellness', 'Fitness', 'Finance', 'Relationships', 'Faith', 'Writing', 'Other'].map((c) => (
              <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field name="description" label="Short description" hint="1–2 sentences shown on registration pages.">
        <Textarea
          placeholder="A focused 5-day experience that helps entrepreneurs…"
          rows={3}
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 2: Outcome ──────────────────────────────────────────────────────

export function Step2Outcome({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Outcome" description="Define the transformation your challenge delivers.">
      <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          A great challenge has a clear starting point and a compelling destination.
          Fill these in carefully — they power your registration page and participant experience.
        </p>
      </div>

      <Field name="startingPoint" label="Participant starting point" required error={shown.startingPoint}
             hint="Where are they when they sign up? What's the pain or gap?">
        <Textarea
          placeholder="e.g. Stuck with a business idea but no clients and no clear plan to get started."
          rows={3}
          value={data.startingPoint}
          onChange={(e) => update({ startingPoint: e.target.value })}
        />
      </Field>

      <Field name="outcome" label="Desired outcome" required error={shown.outcome}
             hint="Where will they be after completing your challenge?">
        <Textarea
          placeholder="e.g. Has landed their first paying client and a repeatable outreach process."
          rows={3}
          value={data.outcome}
          onChange={(e) => update({ outcome: e.target.value })}
        />
      </Field>

      <Field name="promise" label="The promise (one line)" required error={shown.promise}
             hint="Your headline promise — be specific and bold.">
        <Input
          placeholder="e.g. Go from idea to your first paying client in 5 days."
          value={data.promise}
          onChange={(e) => update({ promise: e.target.value })}
        />
      </Field>

      <Field name="successDefinition" label="Success definition"
             hint="How will you and participants know they've succeeded?">
        <Textarea
          placeholder="e.g. Completed all 5 days, submitted their outreach plan, and made at least one offer."
          rows={3}
          value={data.successDefinition}
          onChange={(e) => update({ successDefinition: e.target.value })}
        />
      </Field>

      <Field name="timeCommitment" label="Expected daily time commitment">
        <Select value={data.timeCommitment} onValueChange={(v) => update({ timeCommitment: v })}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Select commitment" /></SelectTrigger>
          <SelectContent>
            {['15 minutes', '30 minutes', '45 minutes', '1 hour', '1–2 hours', '2+ hours'].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 3: Mode ─────────────────────────────────────────────────────────

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

export function Step3Mode({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Challenge Mode" description="Choose how your challenge will run.">
      <Field name="mode" label="Mode" required error={shown.mode}>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Challenge mode">
          {MODES.map((m) => {
            const selected = data.mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ mode: m.id })}
                className={cn(
                  'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{m.label}</span>
                  {selected && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
              </button>
            )
          })}
        </div>
      </Field>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 4: Schedule ─────────────────────────────────────────────────────

const TIMING_MODELS = [
  { id: 'fixed_calendar', label: 'Fixed Calendar',        desc: 'All participants see the same active day.' },
  { id: 'rolling',        label: 'Rolling Enrollment',    desc: 'Each participant has their own Day 1.' },
  { id: 'open_access',    label: 'Open Access',           desc: 'All published days available immediately.' },
  { id: 'sequential',     label: 'Sequential Completion', desc: 'Next step unlocks after previous is completed.' },
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Karachi',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
]

export function Step4Schedule({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Schedule" description="Configure when your challenge runs and how content unlocks.">
      <Field name="timezone" label="Timezone" required error={shown.timezone}
             hint="All unlock times are calculated in this timezone.">
        <Select value={data.timezone} onValueChange={(v) => update({ timezone: v })}>
          <SelectTrigger className="sm:max-w-sm"><SelectValue placeholder="Select timezone" /></SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="registrationOpensAt" label="Registration opens" error={shown.registrationOpensAt}>
          <Input type="date" value={data.registrationOpensAt}
                 onChange={(e) => update({ registrationOpensAt: e.target.value })} />
        </Field>
        <Field name="registrationClosesAt" label="Registration closes" error={shown.registrationClosesAt}>
          <Input type="date" value={data.registrationClosesAt}
                 onChange={(e) => update({ registrationClosesAt: e.target.value })} />
        </Field>
        <Field name="startsAt" label="Challenge starts" required error={shown.startsAt}>
          <Input type="date" value={data.startsAt}
                 onChange={(e) => update({ startsAt: e.target.value })} />
        </Field>
        <Field name="endsAt" label="Challenge ends" error={shown.endsAt}>
          <Input type="date" value={data.endsAt}
                 onChange={(e) => update({ endsAt: e.target.value })} />
        </Field>
      </div>

      <Field name="unlockModel" label="Content unlock method" hint="How do participants access new days?">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Content unlock method">
          {TIMING_MODELS.map((t) => {
            const selected = data.unlockModel === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ unlockModel: t.id })}
                className={cn(
                  'flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <span className="font-medium text-foreground">{t.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field name="gracePeriod" label="Grace period"
             hint="Extra hours after midnight to complete the previous day.">
        <Select value={data.gracePeriod} onValueChange={(v) => update({ gracePeriod: v })}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="No grace period" /></SelectTrigger>
          <SelectContent>
            {['None', '2 hours', '4 hours', '8 hours', '12 hours', '24 hours'].map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 5: Audience ─────────────────────────────────────────────────────

export function Step5Audience({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  const options = [
    { id: 'public',     Icon: Globe,     label: 'Public',                desc: 'Anyone can register via the public page.' },
    { id: 'invite',     Icon: UserCheck, label: 'Invite-only',           desc: 'Only people you invite can register.' },
    { id: 'restricted', Icon: Lock,      label: 'Membership-restricted', desc: 'Restricted to existing community members.' },
  ]

  return (
    <Section title="Audience" description="Control who can join your challenge.">
      <Field name="visibility" label="Visibility" required error={shown.visibility}>
        <div className="grid gap-3" role="radiogroup" aria-label="Visibility">
          {options.map(({ id, Icon, label, desc }) => {
            const selected = data.visibility === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ visibility: id })}
                className={cn(
                  'flex items-start gap-4 rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <span className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                {selected && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>
      </Field>

      <Field name="maxParticipants" label="Capacity" error={shown.maxParticipants}
             hint="Maximum number of participants. Leave blank for unlimited.">
        <Input
          type="number"
          min={1}
          placeholder="Unlimited"
          className="sm:max-w-xs"
          value={data.maxParticipants}
          onChange={(e) => update({ maxParticipants: e.target.value })}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Require approval</p>
          <p className="text-xs text-muted-foreground">Manually approve each registration before granting access.</p>
        </div>
        <Switch
          checked={data.requiresApproval}
          onCheckedChange={(v) => update({ requiresApproval: v })}
          aria-label="Require approval"
        />
      </div>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 6: Experience ───────────────────────────────────────────────────

const FEATURE_TOGGLES = [
  { key: 'liveSessions', label: 'Live sessions',       desc: 'Add Zoom or YouTube live events per day.' },
  { key: 'community',    label: 'Challenge feed',      desc: 'Dedicated social feed for participant posts.' },
  { key: 'submissions',  label: 'Homework submissions', desc: 'Collect text, files, or reflection responses.' },
  { key: 'gamification', label: 'Points & badges',     desc: 'Award XP for completed actions and milestones.' },
  { key: 'leaderboard',  label: 'Leaderboard',         desc: 'Optional — show ranked participant progress.' },
  { key: 'reflections',  label: 'Private reflections', desc: 'Private journal prompts visible only to the participant.' },
]

export function Step6Experience({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Experience" description="Choose which features to enable for this challenge.">
      <Field name="numDays" label="Number of days / steps" required error={shown.numDays}>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            max={365}
            placeholder="5"
            className="w-28"
            value={data.numDays}
            onChange={(e) => update({ numDays: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </Field>

      <div className="space-y-3">
        {FEATURE_TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch
              checked={data.features[t.key] ?? false}
              onCheckedChange={(v) => update({ features: { ...data.features, [t.key]: v } })}
              aria-label={t.label}
            />
          </div>
        ))}
      </div>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 7: Communications ───────────────────────────────────────────────

const EMAIL_TRIGGERS = [
  { key: 'registration', label: 'Registration confirmation', desc: 'Sent immediately after someone registers.' },
  { key: 'start',        label: 'Challenge starting soon',   desc: 'Sent 24 hours before Day 1 unlocks.' },
  { key: 'daily',        label: 'Day available',             desc: 'Notifies participants when a new day unlocks.' },
  { key: 'reminder',     label: 'Live session reminder',     desc: 'Sent before each scheduled live session.' },
  { key: 'inactivity',   label: 'Inactivity nudge',          desc: 'Sent after configured days without progress.' },
  { key: 'completion',   label: 'Completion celebration',    desc: 'Sent when a participant finishes the challenge.' },
]

export function Step7Communications({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, markAttempted } = useStepErrors(step)

  return (
    <Section title="Communications" description="Control which automated emails participants receive.">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Security emails (account setup, password reset) are always sent and cannot be disabled.
      </div>

      <div className="space-y-3">
        {EMAIL_TRIGGERS.map((t) => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <Switch
              checked={data.emailTriggers[t.key] ?? false}
              onCheckedChange={(v) => update({ emailTriggers: { ...data.emailTriggers, [t.key]: v } })}
              aria-label={t.label}
            />
          </div>
        ))}
      </div>

      <Field name="inactivityDays" label="Inactivity trigger (days without progress)">
        <Select value={data.inactivityDays} onValueChange={(v) => update({ inactivityDays: v })}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="2 days" /></SelectTrigger>
          <SelectContent>
            {['1 day', '2 days', '3 days', '5 days'].map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 8: Conversion ───────────────────────────────────────────────────

export function Step8Conversion({ step, setStep }: StepProps) {
  const { data, update } = useWizard()
  const { errors, shown, markAttempted } = useStepErrors(step)

  return (
    <Section title="Conversion" description="Configure the post-challenge offer shown to completers.">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Enable post-challenge offer</p>
          <p className="text-xs text-muted-foreground">Show a CTA page after participants complete the challenge.</p>
        </div>
        <Switch
          checked={data.hasOffer}
          onCheckedChange={(v) => update({ hasOffer: v })}
          aria-label="Enable post-challenge offer"
        />
      </div>

      {/* The fields below are only required while the offer is on — turning it
          off is a valid answer, a half-filled offer is not. */}
      {data.hasOffer && (
        <div className="space-y-4">
          <Field name="offerHeadline" label="Offer headline" required error={shown.offerHeadline}>
            <Input
              placeholder="e.g. Ready to go deeper? Join the full program."
              value={data.offerHeadline}
              onChange={(e) => update({ offerHeadline: e.target.value })}
            />
          </Field>

          <Field name="offerCtaText" label="CTA button text" required error={shown.offerCtaText}>
            <Input
              placeholder="e.g. Get instant access"
              value={data.offerCtaText}
              onChange={(e) => update({ offerCtaText: e.target.value })}
            />
          </Field>

          <Field name="offerUrl" label="Destination URL" required error={shown.offerUrl}
                 hint="Your sales page, checkout, or Calendly link.">
            <Input
              type="url"
              placeholder="https://your-checkout.com/offer"
              value={data.offerUrl}
              onChange={(e) => update({ offerUrl: e.target.value })}
            />
          </Field>

          <Field name="offerDeadline" label="Offer deadline" error={shown.offerDeadline}
                 hint="Creates urgency. Leave blank for no deadline.">
            <Input
              type="datetime-local"
              value={data.offerDeadline}
              onChange={(e) => update({ offerDeadline: e.target.value })}
            />
          </Field>

          <Field name="offerBonuses" label="Bonuses" hint="List any time-sensitive bonuses (one per line).">
            <Textarea
              placeholder={'1:1 strategy call\nPrivate Slack access'}
              rows={3}
              value={data.offerBonuses}
              onChange={(e) => update({ offerBonuses: e.target.value })}
            />
          </Field>
        </div>
      )}

      <StepNav step={step} setStep={setStep} errors={errors} onAttempt={() => markAttempted(step)} />
    </Section>
  )
}

// ─── Step 9: Review & Publish ─────────────────────────────────────────────

export function Step9Review({ step, setStep }: StepProps) {
  const { data } = useWizard()
  const { onPublish, isPublishing } = useWizardPublish()

  // Ask the same validator the earlier steps used, so this cannot drift from
  // what those steps actually enforce.
  const outstanding = incompleteSteps(data)
  const allDone = outstanding.length === 0

  const summary = [
    { label: 'Title',    value: data.title || '—' },
    { label: 'Mode',     value: MODES.find((m) => m.id === data.mode)?.label ?? data.mode ?? '—' },
    { label: 'Starts',   value: data.startsAt ? new Date(data.startsAt).toLocaleDateString() : '—' },
    { label: 'Audience', value: data.visibility === 'public' ? 'Public' : data.visibility === 'invite' ? 'Invite-only' : 'Membership-restricted' },
    { label: 'Days',     value: data.numDays || '—' },
    { label: 'Offer',    value: data.hasOffer ? 'Enabled' : 'Disabled' },
  ]

  return (
    <Section title="Review & Publish" description="Check everything before going live.">
      <div className="grid gap-3 sm:grid-cols-2">
        {summary.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Publish checklist</p>
        {Object.entries(STEP_LABELS).map(([id, label]) => {
          const n = Number(id)
          const done = !outstanding.includes(n)
          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm',
                done
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-border bg-muted/30 text-muted-foreground'
              )}
            >
              <CheckCircle className={cn('h-4 w-4 shrink-0', done ? 'text-green-500' : 'text-muted-foreground')} />
              <span>Step {n} — {label}</span>
              {!done && (
                <button
                  type="button"
                  onClick={() => setStep(n)}
                  className="ml-auto"
                >
                  <Badge variant="outline" className="cursor-pointer text-xs hover:bg-background">
                    Incomplete — fix
                  </Badge>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {!allDone && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Finish the steps marked incomplete before publishing. Selecting one takes you straight to it.
        </div>
      )}

      <StepNav
        step={step}
        setStep={setStep}
        isLast
        canNext={allDone}
        nextLabel="Create challenge"
        onPublish={onPublish}
        isPublishing={isPublishing}
      />
    </Section>
  )
}
