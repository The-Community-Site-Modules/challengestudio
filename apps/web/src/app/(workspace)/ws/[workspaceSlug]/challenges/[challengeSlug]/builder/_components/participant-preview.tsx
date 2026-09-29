'use client'

/**
 * The day as a participant sees it, inside a desktop or phone frame.
 *
 * ── What is real here and what is illustrative ──────────────────────────────
 *
 * Every row comes from the creator's actual blocks: the titles, the order, the
 * XP, which ones are required, the video's length. Edit a block and this
 * changes with it — that is the whole point of the mode.
 *
 * Two things are staged rather than measured: the first row shows as done, and
 * the streak reads 7. Nobody is enrolled, so there is no real progress to show,
 * and a preview where everything is untouched never demonstrates the completed
 * state the creator is trying to judge. The frame says "Participant view" for
 * exactly this reason — it is a rehearsal, not a dashboard. Do not wire these
 * two to anything that looks like a statistic.
 *
 * "Complete Day N" is a styled div, not a button. A creator is not a
 * participant, and a real click would be completing a day on behalf of someone
 * who does not exist.
 */

import {
  Play, ClipboardList, Share2, Radio, BadgeDollarSign, Lock, CircleCheck,
  Type, Image as ImageIcon, Download, CheckSquare, MessageSquare, Upload,
  BookOpen, Flame, Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { BlockItem } from '@/components/challenge/content-block-editor'

const ROW_ICON: Record<string, React.ReactNode> = {
  heading:           <Type className="h-4 w-4" />,
  video:             <Play className="h-4 w-4" />,
  image:             <ImageIcon className="h-4 w-4" />,
  download:          <Download className="h-4 w-4" />,
  checklist:         <CheckSquare className="h-4 w-4" />,
  assignment:        <ClipboardList className="h-4 w-4" />,
  text_response:     <MessageSquare className="h-4 w-4" />,
  file_upload:       <Upload className="h-4 w-4" />,
  reflection:        <BookOpen className="h-4 w-4" />,
  discussion_prompt: <Share2 className="h-4 w-4" />,
  live_session:      <Radio className="h-4 w-4" />,
  offer_cta:         <BadgeDollarSign className="h-4 w-4" />,
}

function rowTitle(block: BlockItem): string {
  const p = block.payload
  return p.title || p.heading || p.caption || p.prompt || p.name || 'Untitled block'
}

/** The one line under the title, chosen by what that block type makes matter. */
function rowSubtitle(block: BlockItem): string {
  const p = block.payload
  const parts: string[] = []

  switch (block.type) {
    case 'video':
      if (p.duration) parts.push(p.duration)
      break
    case 'live_session':
      return 'Scheduled live event'
    case 'offer_cta':
      return 'Next-step offer'
    case 'reflection':
      return 'Private reflection'
    default:
      break
  }

  if (block.required) parts.push('Required')
  else if (block.points) parts.push(`+${block.points} XP`)

  return parts.join(' · ')
}

interface DayView {
  dayNumber: number
  totalDays: number
  title: string
  description: string | null
  blocks: BlockItem[]
  /** Rendered as a locked final row when a later day exists. */
  hasNextDay: boolean
}

function DayBody({ day, compact }: { day: DayView; compact: boolean }) {
  // Staged: see the note at the top of this file.
  const doneIndex = day.blocks.length > 0 ? 0 : -1
  const total = day.blocks.length
  const done = doneIndex >= 0 ? 1 : 0
  const pct = total > 0 ? (done / total) * 100 : 0

  // The block the participant would be on now — used for the inline answer
  // field the design shows on the phone.
  const nextIndex = day.blocks.findIndex(
    (b, i) => i > doneIndex && b.required && (b.type === 'assignment' || b.type === 'text_response')
  )

  return (
    <div className={cn(compact ? 'p-4' : 'p-8')}>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          Day {day.dayNumber} of {day.totalDays}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-orange-600">
          <Flame className="h-4 w-4" aria-hidden="true" /> 7
        </span>
      </div>

      <h2
        className={cn(
          'mt-3 font-bold tracking-tight text-foreground',
          compact ? 'text-[22px] leading-tight' : 'text-[32px] leading-tight'
        )}
      >
        {day.title}
      </h2>
      {day.description && (
        <p className={cn('mt-1.5 text-muted-foreground', compact ? 'text-[13px]' : 'text-[15px]')}>
          {day.description}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {compact ? `${done}/${total}` : `${done} of ${total} done`}
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {day.blocks.map((block, i) => {
          const isDone = i === doneIndex
          const isNext = i === nextIndex
          const subtitle = rowSubtitle(block)

          return (
            <li
              key={block.id}
              className={cn(
                'rounded-xl border',
                isNext ? 'border-primary/40 bg-primary/[0.04]' : 'border-border bg-background'
              )}
            >
              <div className="flex items-center gap-3 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {ROW_ICON[block.type] ?? <Type className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">
                    {rowTitle(block)}
                  </p>
                  {subtitle && (
                    <p
                      className={cn(
                        'truncate text-[13px]',
                        block.required ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                {isDone && (
                  <CircleCheck className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                )}
              </div>

              {isNext && compact && (
                <div className="px-3.5 pb-3.5">
                  <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-muted-foreground">
                    Type your answer…
                  </div>
                </div>
              )}
            </li>
          )
        })}

        {day.hasNextDay && (
          <li className="rounded-xl border border-border bg-background">
            <div className="flex items-center gap-3 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-foreground">
                  Day {day.dayNumber + 1}
                </p>
                <p className="text-[13px] text-muted-foreground">Unlocks at midnight</p>
              </div>
            </div>
          </li>
        )}

        {day.blocks.length === 0 && (
          <li className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            This day has no content yet. Add blocks in Edit to see them here.
          </li>
        )}
      </ul>

      {/* Not a button — see the note at the top of this file. */}
      <div
        className={cn(
          'mt-6 rounded-xl bg-primary text-center font-semibold text-primary-foreground',
          compact ? 'py-3 text-[14px]' : 'py-4 text-[15px]'
        )}
      >
        Complete Day {day.dayNumber}
      </div>
    </div>
  )
}

// ─── Desktop frame ───────────────────────────────────────────────────────────

export function DesktopPreview({ day }: { day: DayView }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" aria-hidden="true" />
          <span className="ml-3 text-xs text-muted-foreground">Participant view · desktop</span>
        </div>
        <DayBody day={day} compact={false} />
      </div>
    </div>
  )
}

// ─── Phone frame ─────────────────────────────────────────────────────────────

export function MobilePreview({ day, onBackToEditing }: { day: DayView; onBackToEditing: () => void }) {
  // Side by side only at xl. This pane sits between a 255px journey panel and a
  // 300px settings panel, so an `lg` viewport leaves it around 850px — enough
  // for the breakpoint to fire and not enough for a 360px phone plus a readable
  // column beside it.
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center gap-10 px-6 py-8 xl:flex-row xl:items-start xl:gap-14">
      <div className="w-[360px] shrink-0 overflow-hidden rounded-[2.5rem] border-[10px] border-foreground bg-background shadow-2xl">
        <div className="flex items-center justify-between bg-background px-6 py-2 text-[11px] font-medium text-foreground">
          <span>9:41</span>
          <span className="h-1 w-16 rounded-full bg-foreground/15" aria-hidden="true" />
          <span>100%</span>
        </div>
        <DayBody day={day} compact />
      </div>

      <div className="min-w-0 max-w-sm xl:pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          Participant preview
        </p>
        <h3 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-foreground">
          One day at a time, on the phone in their hand.
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          This is exactly what participants see for Day {day.dayNumber}. Required blocks
          gate completion; the next day stays locked until it unlocks.
        </p>
        <Button variant="outline" className="mt-5 gap-2" onClick={onBackToEditing}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Back to editing
        </Button>
      </div>
    </div>
  )
}

export type { DayView }
