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

import { Settings2, CalendarDays, ImageUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { BuilderStep } from '@/components/challenge/builder-sidebar'

export interface DayPatch {
  title?: string
  description?: string | null
  estimatedMinutes?: number | null
  pointsXp?: number | null
  isRequired?: boolean
  unlockRule?: string | null
  completionMethod?: string | null
  tomorrowTeaser?: string | null
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
  step: BuilderStep & { description?: string | null; unlockRule?: string | null; tomorrowTeaser?: string | null }
  dayNumber: number
  /** Pre-formatted in the challenge's timezone by the server. */
  unlocksAt: string | null
  onUpdate: (patch: DayPatch) => void
}

export function DaySettings({ step, dayNumber, unlocksAt, onUpdate }: Props) {
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

        {/* Disabled on purpose. `lib/storage` throws because no storage
            provider has been chosen, so an enabled control here would take a
            file and lose it. */}
        <div className="space-y-1.5">
          <Label>Day image</Label>
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <ImageUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Upload image</p>
            <p className="text-[11px] leading-snug text-muted-foreground/80">
              Available once a storage provider is configured.
            </p>
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
      </div>
    </aside>
  )
}
