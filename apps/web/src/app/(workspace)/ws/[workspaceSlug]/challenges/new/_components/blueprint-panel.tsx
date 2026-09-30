'use client'

/**
 * The blueprint: what the wizard knows about this challenge so far.
 *
 * Every row is derived from wizard state and says "Not selected" until it is.
 * Nothing here is a default dressed up as a decision — if the reader has not
 * chosen a duration, the panel does not quietly show them 5 days and let them
 * believe they picked it.
 */

import { useState } from 'react'
import { Flag, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useWizard, type WizardState } from '../_context/wizard-context'

const MODE_LABELS: Record<string, string> = {
  marketing: 'Marketing challenge',
  cohort:    'Cohort challenge',
  evergreen: 'Evergreen challenge',
  habit:     'Habit challenge',
  internal:  'Internal challenge',
  paid:      'Paid challenge',
  team:      'Team challenge',
  milestone: 'Milestone journey',
}

const UNLOCK_LABELS: Record<string, string> = {
  fixed_calendar:    'Fixed calendar dates',
  rolling:           'Rolling from join date',
  open:              'All open at once',
  scheduled_release: 'Scheduled release',
}

function blueprintRows(data: WizardState) {
  const days = Number(data.numDays)
  return [
    { label: 'Type', value: MODE_LABELS[data.mode] ?? null },
    {
      label: 'Duration',
      value: Number.isFinite(days) && days > 0 ? `${days} ${days === 1 ? 'day' : 'days'}` : null,
    },
    {
      label: 'Audience',
      value: data.visibility === 'public' ? 'Anyone with the link'
        : data.visibility === 'private' ? 'Invite only'
        : null,
    },
    { label: 'Delivery', value: UNLOCK_LABELS[data.unlockModel] ?? null },
  ]
}

export function BlueprintPanel() {
  const { data } = useWizard()
  const [open, setOpen] = useState(false)
  const rows = blueprintRows(data)

  return (
    <aside className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Challenge blueprint
        </p>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" /> Live
        </span>
      </div>

      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Flag className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-foreground">
            {data.title || 'Untitled Challenge'}
          </p>
          <p className="truncate text-[13px] text-muted-foreground">
            {data.slug ? `mychallengestudio.com/c/${data.slug}` : 'No URL yet'}
          </p>
        </div>
      </div>

      <dl className="border-t border-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 last:border-b-0"
          >
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd
              className={
                row.value
                  ? 'truncate text-sm font-medium text-foreground'
                  : 'truncate text-sm text-muted-foreground/70'
              }
            >
              {row.value ?? 'Not selected'}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Your blueprint fills in as you go. Every choice you make in the wizard shows up here.
        </p>
      </div>

      <div className="border-t border-border p-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Smartphone className="h-4 w-4" aria-hidden="true" /> Preview Participant Experience
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>How this looks to a participant</DialogTitle>
            </DialogHeader>
            <RegistrationPreview data={data} />
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  )
}

/**
 * The registration card, built from what has been filled in so far.
 *
 * This is the first screen a participant meets, so it is the honest thing to
 * preview before any days exist. Empty fields show as placeholders rather than
 * invented copy — seeing the gaps is the point.
 */
function RegistrationPreview({ data }: { data: WizardState }) {
  const days = Number(data.numDays)
  const duration = Number.isFinite(days) && days > 0 ? `${days}-day challenge` : 'Challenge'

  return (
    <div className="overflow-hidden rounded-[2rem] border-[8px] border-foreground bg-background">
      <div className="flex items-center justify-between px-5 py-2 text-[11px] font-medium text-foreground">
        <span>9:41</span>
        <span className="h-1 w-14 rounded-full bg-foreground/15" aria-hidden="true" />
        <span>100%</span>
      </div>

      <div className="h-32 bg-[repeating-linear-gradient(135deg,hsl(var(--muted))_0_10px,transparent_10px_20px)]">
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Cover image
        </div>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
          {duration}
        </p>
        <h3 className="mt-1.5 text-[20px] font-bold leading-tight tracking-tight text-foreground">
          {data.title || 'Untitled Challenge'}
        </h3>
        {data.hostName && (
          <p className="mt-1 text-[13px] text-muted-foreground">by {data.hostName}</p>
        )}
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {data.description || 'Your short description appears here.'}
        </p>

        <div className="mt-5 rounded-xl bg-primary py-3 text-center text-[14px] font-semibold text-primary-foreground">
          Join this challenge
        </div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
          Preview only — nothing is live until you create the challenge.
        </p>
      </div>
    </div>
  )
}
