'use client'

/**
 * The challenge journey: every day in order, with how finished each one is.
 *
 * ── On the three statuses ───────────────────────────────────────────────────
 *
 * The design shows Draft / Ready / Published, and there is no `ready` column
 * to read. Rather than invent one, the state is derived from what the schema
 * actually knows:
 *
 *   Published — `is_published` is true. Participants can see it once it unlocks.
 *   Ready     — not published, but it has content blocks. Nothing is missing;
 *               somebody just has to say go.
 *   Draft     — no blocks yet. There is nothing to publish.
 *
 * That is a truthful mapping rather than an exact one: a day with blocks that
 * the creator still considers unfinished shows as Ready. If "ready" needs to
 * mean something the creator decides rather than something derived, it needs a
 * column, and this comment is the place that will tell you why.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Plus, GripVertical, Check, Clock, Pencil, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BuilderStep } from '@/components/challenge/builder-sidebar'

export type DayState = 'published' | 'ready' | 'draft'

export function dayState(step: Pick<BuilderStep, 'isPublished' | 'blockCount'>): DayState {
  if (step.isPublished) return 'published'
  return step.blockCount > 0 ? 'ready' : 'draft'
}

const STATE_META: Record<DayState, { label: string; icon: React.ReactNode; dot: string }> = {
  published: {
    label: 'Published',
    icon: <Check className="h-3 w-3" />,
    dot: 'bg-green-500',
  },
  ready: {
    label: 'Ready',
    icon: <Clock className="h-3 w-3" />,
    dot: 'bg-primary',
  },
  draft: {
    label: 'Draft',
    icon: <Pencil className="h-3 w-3" />,
    dot: 'border border-muted-foreground/50',
  },
}

interface Props {
  steps: BuilderStep[]
  activeStepId: string
  challengeTitle: string
  /** Shown in the slot the design gives a category picker. */
  modeLabel: string
  settingsHref: string
  onSelectStep: (id: string) => void
  onAddStep: () => void
  onReorder: (orderedIds: string[]) => void
  onDeleteStep: (id: string) => void
  /** Submissions per day, so the confirm can say what goes with it. */
  submissionCounts?: Record<string, number>
}

export function JourneySidebar({
  steps, activeStepId, challengeTitle, modeLabel, settingsHref,
  onSelectStep, onAddStep, onReorder, onDeleteStep, submissionCounts = {},
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  /**
   * The day whose delete is awaiting a second press.
   *
   * Two presses rather than a dialog: the control lives in a narrow list where
   * a modal would be heavier than the action, and the second press is right
   * there under the cursor. Deleting a day takes its blocks and any
   * submissions on it, so the confirm says which and how many.
   */
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const readyCount = steps.filter((s) => dayState(s) !== 'draft').length
  const pct = steps.length > 0 ? Math.round((readyCount / steps.length) * 100) : 0

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    const from = steps.findIndex((s) => s.id === dragId)
    const to = steps.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    onReorder(next.map((s) => s.id))
  }

  return (
    <aside className="flex w-[255px] shrink-0 flex-col border-r border-border bg-background">
      <div className="px-4 pb-4 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Challenge journey
        </p>
        <p className="mt-1 text-[15px] font-bold leading-tight tracking-tight text-foreground">
          {challengeTitle}
        </p>

        {/* The design puts a category picker here. This challenge has a mode,
            not a category, and mode is changed in settings — so this is a link
            that looks like the control it replaces rather than a select that
            would have nothing to select. */}
        <Link
          href={settingsHref}
          className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted/50"
        >
          {modeLabel}
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {readyCount}/{steps.length} ready
          </span>
        </div>
      </div>

      <nav aria-label="Challenge days" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {steps.map((step, i) => {
            const state = dayState(step)
            const meta = STATE_META[state]
            const active = step.id === activeStepId

            return (
              <li
                key={step.id}
                draggable
                onDragStart={() => setDragId(step.id)}
                onDragOver={(e) => handleDragOver(e, step.id)}
                className="group relative"
                onDragEnd={() => setDragId(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'group flex w-full items-start gap-2 rounded-lg border-l-2 py-2.5 pl-2 pr-2.5 text-left transition-colors',
                    active
                      ? 'border-l-primary bg-primary/[0.07]'
                      : 'border-l-transparent hover:bg-muted/60'
                  )}
                >
                  <GripVertical
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Day {i + 1}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] font-semibold text-foreground">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {step.blockCount} {step.blockCount === 1 ? 'block' : 'blocks'} · {meta.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                      state === 'published' && 'bg-green-100 text-green-700',
                      state === 'ready' && 'bg-primary/10 text-primary',
                      state === 'draft' && 'text-muted-foreground'
                    )}
                    title={meta.label}
                  >
                    {meta.icon}
                    <span className="sr-only">{meta.label}</span>
                  </span>
                </button>

                {/* Shown on hover or focus, so the list stays calm but the
                    control is reachable by keyboard rather than hover-only. */}
                <button
                  type="button"
                  onClick={() => setConfirmingId(step.id)}
                  aria-label={`Delete ${step.title}`}
                  className={cn(
                    'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100',
                    confirmingId === step.id && 'opacity-0'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                {confirmingId === step.id && (
                  <div
                    role="alertdialog"
                    aria-label={`Delete ${step.title}?`}
                    className="mt-1 rounded-lg border border-destructive/40 bg-destructive/[0.04] p-2.5"
                  >
                    <p className="text-[11px] leading-snug text-foreground">
                      Delete this day?
                      {(step.blockCount > 0 || (submissionCounts[step.id] ?? 0) > 0) && (
                        <>
                          {' '}
                          It takes{' '}
                          {step.blockCount > 0 && (
                            <strong>
                              {step.blockCount} {step.blockCount === 1 ? 'block' : 'blocks'}
                            </strong>
                          )}
                          {step.blockCount > 0 && (submissionCounts[step.id] ?? 0) > 0 && ' and '}
                          {(submissionCounts[step.id] ?? 0) > 0 && (
                            <strong>
                              {submissionCounts[step.id]}{' '}
                              {submissionCounts[step.id] === 1 ? 'submission' : 'submissions'}
                            </strong>
                          )}
                          {' '}with it.
                        </>
                      )}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteStep(step.id)
                          setConfirmingId(null)
                        }}
                        className="rounded-md bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onAddStep}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Day
        </button>

        <ul className="mt-3 flex items-center justify-center gap-4">
          {(['draft', 'ready', 'published'] as const).map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', STATE_META[s].dot)} aria-hidden="true" />
              {STATE_META[s].label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
