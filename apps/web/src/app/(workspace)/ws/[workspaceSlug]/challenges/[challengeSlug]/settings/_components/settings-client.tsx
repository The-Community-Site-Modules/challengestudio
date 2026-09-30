'use client'

/**
 * Challenge settings, wired to the row.
 *
 * ── The timezone conversion, and why it is not `new Date(value)` ────────────
 *
 * The date inputs hold a wall clock in the *challenge's* timezone — that is
 * what a creator means when they type 8:00 on the 14th. `new Date('…T08:00')`
 * reads that string in whatever zone the machine running it happens to be in,
 * so a creator in Karachi scheduling a US-Pacific challenge would set a time
 * twelve hours out, and nothing would look wrong until the day unlocked.
 *
 * `zonedToIso` below converts properly: guess the instant, ask Intl what that
 * instant reads as in the target zone, and correct by the difference. It is
 * the same care `lib/enrollment/unlock` takes, for the same reason.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { updateChallengeAction, closeChallengeAction } from '../../../actions'

interface ChallengeSettings {
  id: string
  slug: string
  title: string
  status: string
  mode: string
  timezone: string
  startsAt: string
  endsAt: string
  registrationOpensAt: string
  registrationClosesAt: string
  isPublic: boolean
  maxParticipants: number | null
  requiresApproval: boolean
  participantCount: number
}

const MODES = [
  { value: 'self_paced',       label: 'Self-paced — each person starts when they join' },
  { value: 'cohort',           label: 'Cohort — everyone moves together on fixed dates' },
  { value: 'drip',             label: 'Drip — content releases on a schedule' },
  { value: 'sprint',           label: 'Sprint — short and dated' },
  { value: 'evergreen',        label: 'Evergreen — always open, Day 1 is join day' },
  { value: 'live_event',       label: 'Live event — built around sessions' },
  { value: 'certification',    label: 'Certification' },
  { value: 'challenge_ladder', label: 'Challenge ladder' },
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata',
  'Asia/Singapore', 'Australia/Sydney',
]

/** How far the zone is from UTC at this instant, in milliseconds. */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0')
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asIfUtc - at.getTime()
}

/** 'YYYY-MM-DDTHH:mm' read in `timeZone` → an ISO instant. Empty stays empty. */
function zonedToIso(local: string, timeZone: string): string {
  if (!local) return ''
  const guess = new Date(`${local}:00Z`)
  if (Number.isNaN(guess.getTime())) return ''
  return new Date(guess.getTime() - offsetMs(guess, timeZone)).toISOString()
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'secondary'> = {
  PUBLISHED: 'success', ACTIVE: 'success', DRAFT: 'warning',
}

export default function ChallengeSettingsClient({
  workspaceSlug, challenge,
}: {
  workspaceSlug: string
  challenge: ChallengeSettings
}) {
  const [form, setForm] = useState(challenge)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [isClosing, startClosing] = useTransition()
  const router = useRouter()

  function set<K extends keyof ChallengeSettings>(key: K, value: ChallengeSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(challenge)

  function handleSave() {
    setError(null)
    startSaving(async () => {
      const result = await updateChallengeAction(challenge.id, workspaceSlug, {
        slug: form.slug,
        mode: form.mode,
        timezone: form.timezone,
        startsAt: zonedToIso(form.startsAt, form.timezone),
        endsAt: zonedToIso(form.endsAt, form.timezone),
        registrationOpensAt: zonedToIso(form.registrationOpensAt, form.timezone),
        registrationClosesAt: zonedToIso(form.registrationClosesAt, form.timezone),
        isPublic: form.isPublic,
        maxParticipants: form.maxParticipants,
        requiresApproval: form.requiresApproval,
      })

      if (result && 'error' in result && result.error) {
        setError(result.error)
        return
      }

      setSaved(true)
      // The slug is part of this page's own URL, so a change has to move the
      // browser as well as the row.
      if (result && 'slug' in result && result.slug !== challenge.slug) {
        router.replace(`/ws/${workspaceSlug}/challenges/${result.slug}/settings`)
      }
      router.refresh()
    })
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Challenge settings"
        description={challenge.title}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/c/${challenge.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" /> Preview
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !dirty} className="gap-2">
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : saved && !dirty ? (
                <><Check className="h-4 w-4" /> Saved</>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        }
      />

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Two columns on a wide screen rather than one narrow one. The cards
          spread; the fields inside them do not — a 1600px-wide text input is
          harder to read than a 400px one, so each control keeps its own cap. */}
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        {/* ── Status & address ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status &amp; address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
              <Badge variant={STATUS_TONE[challenge.status] ?? 'secondary'} className="shrink-0">
                {challenge.status.charAt(0) + challenge.status.slice(1).toLowerCase()}
              </Badge>
              <p className="flex-1 text-sm text-muted-foreground">
                {challenge.participantCount} {challenge.participantCount === 1 ? 'person has' : 'people have'} registered.
              </p>
              {(challenge.status === 'PUBLISHED' || challenge.status === 'ACTIVE') && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isClosing}
                  onClick={() =>
                    startClosing(async () => {
                      await closeChallengeAction(challenge.id, workspaceSlug)
                      router.refresh()
                    })
                  }
                >
                  {isClosing ? 'Closing…' : 'Close registrations'}
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Challenge slug</Label>
              <div className="flex max-w-md items-stretch">
                <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /c/
                </span>
                <Input
                  id="slug"
                  className="rounded-l-none"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing this breaks links you have already shared.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Schedule & format ────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Schedule &amp; format</CardTitle>
            <CardDescription>
              When the challenge runs, and whether everyone moves together.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mode">Format</Label>
              <select
                id="mode"
                value={form.mode.toLowerCase()}
                onChange={(e) => set('mode', e.target.value)}
                className="flex h-10 w-full max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Cohort, drip, sprint and live event count days from the start date below.
                Self-paced and evergreen count from the day each person joins.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={form.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {(TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES]).map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Every time on this page is read in this zone, including day unlocks.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { key: 'startsAt', label: 'Starts' },
                { key: 'endsAt', label: 'Ends' },
                { key: 'registrationOpensAt', label: 'Registration opens' },
                { key: 'registrationClosesAt', label: 'Registration closes' },
              ] as const).map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="datetime-local"
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Access ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Access</CardTitle>
            <CardDescription>Who can join, and how.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                value={form.isPublic ? 'public' : 'invite'}
                onChange={(e) => set('isPublic', e.target.value === 'public')}
                className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="public">Public — anyone with the link</option>
                <option value="invite">Invite only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
                placeholder="Unlimited"
                className="max-w-xs"
                value={form.maxParticipants ?? ''}
                onChange={(e) =>
                  set('maxParticipants', e.target.value === '' ? null : Number(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">Leave blank for unlimited.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-foreground">Require approval</p>
                <p className="text-xs text-muted-foreground">
                  Registrations wait for you before they can open the challenge.
                </p>
              </div>
              <Switch
                checked={form.requiresApproval}
                onCheckedChange={(v) => set('requiresApproval', v)}
                aria-label="Require registration approval"
              />
            </div>
          </CardContent>
        </Card>

        <p className="flex items-start gap-2 text-xs text-muted-foreground xl:col-span-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Changing the format or start date moves when days unlock for everyone already
          registered.
        </p>
      </div>
    </main>
  )
}
