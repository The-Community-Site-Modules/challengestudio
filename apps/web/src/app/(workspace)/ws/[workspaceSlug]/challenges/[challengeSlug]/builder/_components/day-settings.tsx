'use client'

/**
 * Settings for the day currently open in the canvas.
 *
 * Every control here writes to a column. That is worth stating because the
 * design asks for one that does not have a column yet — the day image — and
 * the honest thing is a disabled control that says why, not a styled button
 * that accepts a file and drops it.
 *
 * Text fields save on blur rather than on every keystroke: a save per
 * character would be a request per character, and the creator's own typing is
 * the fastest way to rate-limit themselves.
 */

import { useState } from 'react'
import { Settings2, CalendarDays, ImageUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { UploadField } from '@/components/challenge/upload-field'
import { Textarea } from '@/components/ui/textarea'
import type { BuilderStep } from '@/components/challenge/builder-sidebar'

export interface DayPatch {
  isPublished?: boolean
  title?: string
  description?: string | null
  estimatedMinutes?: number | null
  pointsXp?: number | null
  isRequired?: boolean
  unlockRule?: string | null
  completionMethod?: string | null
  tomorrowTeaser?: string | null
  dayImageUrl?: string | null
}

const UNLOCK_RULES = [
  { value: 'scheduled_date',  label: 'On scheduled date' },
  { value: 'after_previous',  label: 'After the previous day is done' },
  { value: 'immediately',     label: 'Immediately' },
]

const COMPLETION_RULES = [
  { value: 'required_blocks', label: 'All required blocks done' },
  { value: 'manual',          label: 'Participant marks it complete' },
]

interface Props {
  step: BuilderStep & { description?: string | null; unlockRule?: string | null; tomorrowTeaser?: string | null; dayImageUrl?: string | null }
  dayNumber: number
  /** Pre-formatted in the challenge's timezone by the server. */
  unlocksAt: string | null
  /** Omitted where deleting is not offered. */
  onDelete?: () => void
  submissionCount?: number
  onUpdate: (patch: DayPatch) => void
}

export function DaySettings({
  step, dayNumber, unlocksAt, onUpdate, onDelete, submissionCount = 0,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  /** Only send a patch when the value actually moved. */
  function commit<K extends keyof DayPatch>(key: K, next: DayPatch[K], current: unknown) {
    if (next === current) return
    onUpdate({ [key]: next } as DayPatch)
  }

  return (
    <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-border bg-background xl:block">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Day {dayNumber} settings
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{step.title}</p>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* The one setting that decides whether anybody can see this day.
            `publishChallengeAction` refuses to publish a challenge where no
            step is published, so leaving this control out of the panel — which
            is what the first version of this redesign did — left the creator
            with a blocking error and nothing in the UI that could clear it. */}
        <div
          className={cn(
            'rounded-lg border p-3',
            step.isPublished ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {step.isPublished ? 'Published' : 'Not published'}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {step.isPublished
                  ? 'Participants see this day once it unlocks.'
                  : 'Hidden from participants, even after the challenge goes live.'}
              </p>
            </div>
            <Switch
              checked={step.isPublished}
              onCheckedChange={(v) => onUpdate({ isPublished: v })}
              aria-label="Day is published"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="day-title">Title</Label>
          <Input
            id="day-title"
            key={`${step.id}-title`}
            defaultValue={step.title}
            onBlur={(e) => commit('title', e.target.value.trim(), step.title)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="day-description">Description</Label>
          <Textarea
            id="day-description"
            key={`${step.id}-description`}
            rows={3}
            defaultValue={step.description ?? ''}
            onBlur={(e) => commit('description', e.target.value.trim() || null, step.description ?? null)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="day-minutes">Estimated time</Label>
            <div className="relative">
              <Input
                id="day-minutes"
                key={`${step.id}-minutes`}
                type="number"
                min={0}
                className="pr-10"
                defaultValue={step.estimatedMinutes ?? ''}
                onBlur={(e) =>
                  commit(
                    'estimatedMinutes',
                    e.target.value === '' ? null : Number(e.target.value),
                    step.estimatedMinutes ?? null
                  )
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                min
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="day-points">Points</Label>
            <div className="relative">
              <Input
                id="day-points"
                key={`${step.id}-points`}
                type="number"
                min={0}
                className="pr-10"
                defaultValue={step.pointsXp ?? ''}
                onBlur={(e) =>
                  commit(
                    'pointsXp',
                    e.target.value === '' ? null : Number(e.target.value),
                    step.pointsXp ?? null
                  )
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                XP
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Required</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Counts toward challenge completion
            </p>
          </div>
          <Switch
            checked={step.isRequired}
            onCheckedChange={(v) => onUpdate({ isRequired: v })}
            aria-label="Day is required"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="day-unlock">Unlock rule</Label>
          <select
            id="day-unlock"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={step.unlockRule ?? 'scheduled_date'}
            onChange={(e) => onUpdate({ unlockRule: e.target.value })}
          >
            {UNLOCK_RULES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="day-completion">Completion rule</Label>
          <select
            id="day-completion"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={step.completionMethod ?? 'required_blocks'}
            onChange={(e) => onUpdate({ completionMethod: e.target.value })}
          >
            {COMPLETION_RULES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="day-teaser">Tomorrow teaser</Label>
          <Textarea
            id="day-teaser"
            key={`${step.id}-teaser`}
            rows={2}
            placeholder="Tomorrow you’ll…"
            defaultValue={step.tomorrowTeaser ?? ''}
            onBlur={(e) =>
              commit('tomorrowTeaser', e.target.value.trim() || null, step.tomorrowTeaser ?? null)
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Day image</Label>
          <div className="rounded-lg border border-dashed border-border p-2.5">
            {step.dayImageUrl ? (
              <figure>
                {/* Plain <img>: the host is the storage bucket, and next/image
                    would need it allow-listed in next.config for no gain on a
                    thumbnail this size. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.dayImageUrl}
                  alt=""
                  className="h-24 w-full rounded-md object-cover"
                />
                <figcaption className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Image set</span>
                  <button
                    type="button"
                    onClick={() => onUpdate({ dayImageUrl: null })}
                    className="text-[11px] font-medium text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </figcaption>
              </figure>
            ) : (
              <div className="flex flex-col items-center gap-1 py-3 text-center">
                <ImageUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-[11px] text-muted-foreground">
                  Shown at the top of this day
                </p>
              </div>
            )}

            <div className="mt-2">
              <UploadField
                kind="image"
                label={step.dayImageUrl ? 'Replace image' : 'Upload image'}
                onUploaded={(url) => onUpdate({ dayImageUrl: url })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Schedule</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-[13px] text-foreground">
              {unlocksAt ? `Unlocks ${unlocksAt}` : 'Follows the challenge schedule'}
            </p>
          </div>
        </div>

        {/* Also here, not only in the journey list. Someone who has been
            editing this day's settings is already looking at the day they want
            gone, and going hunting for it in a list to the left is a detour. */}
        {onDelete && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/[0.03] p-3">
            {confirming ? (
              <div role="alertdialog" aria-label={`Delete ${step.title}?`}>
                <p className="text-[12px] leading-snug text-foreground">
                  Delete this day?
                  {step.blockCount > 0 && (
                    <>
                      {' '}
                      Its <strong>{step.blockCount}</strong>{' '}
                      {step.blockCount === 1 ? 'block goes' : 'blocks go'} with it
                      {submissionCount > 0 && (
                        <>
                          , along with <strong>{submissionCount}</strong>{' '}
                          {submissionCount === 1 ? 'submission' : 'submissions'}
                        </>
                      )}
                      .
                    </>
                  )}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="destructive" onClick={onDelete}>
                    Delete day
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center justify-center gap-2 text-[13px] font-medium text-destructive transition-colors hover:underline"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete this day
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
