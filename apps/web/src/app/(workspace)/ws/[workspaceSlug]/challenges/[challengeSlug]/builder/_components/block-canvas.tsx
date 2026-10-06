'use client'

/**
 * The day, as the creator sees it while building: a header describing the day
 * and one card per content block.
 *
 * ── Where `required` and `points` live ──────────────────────────────────────
 *
 * `content_blocks` has three columns that matter — `type`, `order` and a `data`
 * JSON payload. There is no `required` column and no `points` column, so both
 * live inside `data`. That is not a workaround: the payload is already
 * type-specific and these two are part of what a block *is*.
 *
 * It is worth knowing because `saveBlocksAction` used to accept a `required`
 * flag and then write only `type`, `order` and `data` — the toggle in the old
 * editor had never once persisted. Reading and writing both through `data` is
 * what makes the pills on these cards mean anything.
 */

import { useState } from 'react'
import {
  GripVertical, Copy, Trash2, MoreHorizontal, Plus, Play, Clock, FileText,
  Sparkles, CircleCheck, CalendarDays, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { BLOCK_TYPES, BlockPayloadEditor, type BlockItem } from '@/components/challenge/content-block-editor'

// ─── Reading the payload ─────────────────────────────────────────────────────

function str(payload: Record<string, string>, key: string): string {
  const v = payload[key]
  return typeof v === 'string' ? v : ''
}

/**
 * A `datetime-local` value, split for display.
 *
 * Deliberately parsed as a wall clock and not as an instant: the creator typed
 * "Oct 14, 3:00 PM" meaning that time where the challenge runs, and passing it
 * through `new Date()` in the browser would re-interpret it in the creator's
 * own zone and show them a different hour than the one they entered.
 */
function parseWhen(value: string): { month: string; day: string; full: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [, y, mo, d, hh, mm] = m
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = Number(mo) - 1
  const month = monthNames[monthIndex] ?? '—'
  const weekday = new Date(Date.UTC(Number(y), monthIndex, Number(d)))
    .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  return {
    month: month.toUpperCase(),
    day: String(Number(d)),
    full: `${weekday}, ${month} ${Number(d)} · ${hh}:${mm}`,
  }
}

/**
 * Drop blank checklist rows on the way to the database.
 *
 * While editing, a blank row is a row someone is about to type in. Once saved
 * it is an empty task sitting in a participant's list, so it goes here rather
 * than in the editor — which is where trimming it stopped Add item working.
 */
export function stripEmptyChecklistItems(block: BlockItem): BlockItem {
  if (block.type !== 'checklist') return block
  const items = (block.payload.items ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return { ...block, payload: { ...block.payload, items: items.join('\n') } }
}

function typeLabel(type: string): string {
  return BLOCK_TYPES.find((b) => b.type === type)?.label ?? type
}

function typeIcon(type: string): React.ReactNode {
  return BLOCK_TYPES.find((b) => b.type === type)?.icon ?? null
}

// ─── Day header ──────────────────────────────────────────────────────────────

interface DayHeaderProps {
  dayNumber: number
  title: string
  description: string | null
  estimatedMinutes: number | null
  points: number | null
  isRequired: boolean
  unlocksAt: string | null
}

export function DayHeader({
  dayNumber, title, description, estimatedMinutes, points, isRequired, unlocksAt,
}: DayHeaderProps) {
  const meta: { icon: React.ReactNode; label: string; value: string }[] = []
  if (estimatedMinutes) {
    meta.push({
      icon: <Clock className="h-3.5 w-3.5" />,
      label: 'Estimated time',
      value: `${estimatedMinutes} min`,
    })
  }
  if (points) {
    meta.push({
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: 'Reward',
      value: `${points} XP`,
    })
  }
  meta.push({
    icon: <CircleCheck className="h-3.5 w-3.5" />,
    label: 'Required',
    value: isRequired ? 'Yes' : 'No',
  })

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
          Day {dayNumber}
        </p>
        {unlocksAt && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Unlocks {unlocksAt}
          </p>
        )}
      </div>

      <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-[15px] text-muted-foreground">{description}</p>
      )}

      <ul className="mt-5 flex flex-wrap gap-2">
        {meta.map((m) => (
          <li
            key={m.label}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs"
          >
            <span className="text-muted-foreground" aria-hidden="true">{m.icon}</span>
            <span className="text-muted-foreground">{m.label}</span>
            <span className="font-semibold text-foreground">{m.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ─── Per-type previews ───────────────────────────────────────────────────────

/**
 * What the block will look like to a participant, roughly. A preview, not a
 * renderer: it is here so the creator can recognise the block at a glance
 * without opening it.
 */
/**
 * The checklist, edited where it is shown.
 *
 * It used to be a preview of a textarea: the items lived as newline-separated
 * text in a field below, and the list above only mirrored it. Typing a list in
 * one box and reading it in another is two places for the same thing, and
 * neither of them is the list. Each row is now the input, with its own remove
 * and an add at the end.
 *
 * Storage is unchanged — still one newline-separated string in `items` — so
 * nothing already written needs converting.
 */
function ChecklistEditor({
  block, onChange,
}: {
  block: BlockItem
  onChange?: (next: BlockItem) => void
}) {
  const items = (block.payload.items ?? '').split('\n')
  // An empty payload should offer one empty row rather than nothing to type in.
  const rows = items.length > 0 ? items : ['']

  function write(next: string[]) {
    // Written exactly as typed, blank rows included. Trimming here is what
    // broke Add item: it appends an empty row, and a trailing-blank trim
    // removed it again in the same keystroke, so the button did nothing.
    // Empty rows are dropped at save instead — see `stripEmptyChecklistItems`.
    onChange?.({ ...block, payload: { ...block.payload, items: next.join('\n') } })
  }

  if (!onChange) {
    const visible = rows.filter(Boolean)
    return (
      <ul className="space-y-2">
        {(visible.length > 0 ? visible : ['No items yet']).map((item, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="h-4 w-4 shrink-0 rounded border border-border" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {rows.map((item, i) => (
          <li key={i} className="group/row flex items-center gap-2.5">
            <span
              className="h-4 w-4 shrink-0 rounded border border-border"
              aria-hidden="true"
            />
            <input
              value={item}
              onChange={(e) => {
                const next = [...rows]
                next[i] = e.target.value
                write(next)
              }}
              onKeyDown={(e) => {
                // Enter adds the next row, the way a list behaves everywhere
                // else. Backspace on an empty row removes it.
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const next = [...rows]
                  next.splice(i + 1, 0, '')
                  write(next)
                } else if (e.key === 'Backspace' && item === '' && rows.length > 1) {
                  e.preventDefault()
                  write(rows.filter((_, idx) => idx !== i))
                }
              }}
              placeholder="A task participants tick off"
              className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
            />
            <button
              type="button"
              onClick={() => write(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [''])}
              aria-label={`Remove item ${i + 1}`}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/row:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => write([...rows, ''])}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add item
      </button>
    </div>
  )
}

function BlockPreview({
  block, onChange,
}: {
  block: BlockItem
  onChange?: (next: BlockItem) => void
}) {
  const p = block.payload as Record<string, string>

  switch (block.type) {
    case 'video': {
      const url = str(p, 'url')
      const host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] ?? ''
      return (
        <>
          {str(p, 'caption') && (
            <p className="mb-3 text-[15px] font-semibold text-foreground">{str(p, 'caption')}</p>
          )}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-900 to-violet-900">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 10px)',
              }}
            />
            <div className="relative flex h-52 items-center justify-center">
              {url && (
                <span className="absolute left-3 top-3 rounded bg-black/30 px-2 py-0.5 font-mono text-[10px] text-white/80">
                  video · {host}
                </span>
              )}
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="ml-0.5 h-6 w-6 fill-indigo-900 text-indigo-900" aria-hidden="true" />
              </span>
            </div>
          </div>
        </>
      )
    }

    case 'heading':
      return (
        <>
          {str(p, 'heading') && (
            <p className="text-[17px] font-bold tracking-tight text-foreground">{str(p, 'heading')}</p>
          )}
          {str(p, 'body') && (
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {str(p, 'body')}
            </p>
          )}
        </>
      )

    case 'assignment':
    case 'text_response':
    case 'file_upload':
      return (
        <>
          <p className="text-[15px] font-semibold text-foreground">
            {str(p, 'title') || str(p, 'prompt') || typeLabel(block.type)}
          </p>
          {str(p, 'instructions') && (
            <p className="mt-1 text-sm text-muted-foreground">{str(p, 'instructions')}</p>
          )}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-border px-3.5 py-2.5">
            <span className="text-sm text-muted-foreground">
              {block.type === 'file_upload' ? 'File' : 'Text'} submission
            </span>
            {str(p, 'due') && (
              <span className="text-sm text-muted-foreground">Due {str(p, 'due')}</span>
            )}
          </div>
        </>
      )

    case 'discussion_prompt':
      return (
        <>
          <p className="text-[15px] font-semibold text-foreground">
            {str(p, 'title') || 'Post Your Progress'}
          </p>
          {str(p, 'prompt') && (
            <p className="mt-1 text-sm text-muted-foreground">{str(p, 'prompt')}</p>
          )}
          <div className="mt-4 rounded-lg border border-border">
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                AL
              </span>
              <span className="text-sm text-muted-foreground">
                Share with the challenge community…
              </span>
            </div>
            <div className="flex items-center justify-end border-t border-border px-3 py-2">
              <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                Post to feed
              </span>
            </div>
          </div>
        </>
      )

    case 'checklist':
      return <ChecklistEditor block={block} onChange={onChange} />

    case 'reflection':
      return (
        <>
          <p className="text-[15px] font-semibold text-foreground">
            {str(p, 'prompt') || 'Reflection'}
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-border px-3.5 py-6 text-center text-sm text-muted-foreground">
            Private reflection — only this participant sees it
          </div>
        </>
      )

    case 'image': {
      const url = str(p, 'url')
      if (!url) {
        return (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No image yet — paste a URL in the block settings.
          </p>
        )
      }
      return (
        <figure>
          {/* A plain <img>: these are arbitrary creator-supplied URLs, and
              next/image would need every host allow-listed in next.config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={str(p, 'alt')}
            className="max-h-80 w-full rounded-lg border border-border object-contain"
          />
          {str(p, 'alt') && (
            <figcaption className="mt-2 text-xs text-muted-foreground">{str(p, 'alt')}</figcaption>
          )}
        </figure>
      )
    }

    case 'download': {
      const name = str(p, 'name') || 'Download'
      const url = str(p, 'url')
      return (
        <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {url ? 'Ready' : 'No file linked yet'}
          </span>
        </div>
      )
    }

    case 'live_session': {
      const when = parseWhen(str(p, 'startsAt'))
      const mins = str(p, 'durationMinutes')
      return (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border">
            <span className="w-full bg-primary py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
              {when?.month ?? '—'}
            </span>
            <span className="flex-1 text-[15px] font-bold leading-none text-foreground">
              {when?.day ?? '–'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              {str(p, 'title') || 'Live session'}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[when?.full, mins ? `${mins} min` : null].filter(Boolean).join(' · ') ||
                'No time set yet'}
            </p>
          </div>
          <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            Add to calendar
          </span>
        </div>
      )
    }

    case 'offer_cta':
      return (
        <div className="rounded-lg border border-primary/25 bg-primary/[0.04] p-5">
          {str(p, 'eyebrow') && (
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              {str(p, 'eyebrow')}
            </p>
          )}
          <p className="mt-1.5 text-[17px] font-bold tracking-tight text-foreground">
            {str(p, 'title') || 'Your next step'}
          </p>
          {str(p, 'body') && (
            <p className="mt-1 text-sm text-muted-foreground">{str(p, 'body')}</p>
          )}
          <span className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {str(p, 'ctaLabel') || 'Get access'}
          </span>
        </div>
      )

    default:
      return (
        <p className="text-sm text-muted-foreground">
          {str(p, 'title') || str(p, 'name') || str(p, 'caption') || typeLabel(block.type)}
        </p>
      )
  }
}

// ─── Block card ──────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: BlockItem
  onChange: (next: BlockItem) => void
  onDuplicate: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function BlockCard({
  block, onChange, onDuplicate, onDelete, onDragStart, onDragOver, onDragEnd,
}: BlockCardProps) {
  const [open, setOpen] = useState(false)
  const required = block.required
  const points = block.points ?? 0

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className="overflow-hidden rounded-xl border border-border bg-background"
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <GripVertical
          className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40"
          aria-hidden="true"
        />
        <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span aria-hidden="true" className="[&>svg]:h-3 [&>svg]:w-3">{typeIcon(block.type)}</span>
          {typeLabel(block.type)}
        </span>

        {required && (
          <span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-700">
            Required
          </span>
        )}
        {points > 0 && (
          <span className="text-xs font-medium text-muted-foreground">+{points} XP</span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Duplicate block" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete block" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={open ? 'Close block settings' : 'Open block settings'}
            onClick={() => setOpen((v) => !v)}
            expanded={open}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
          </IconButton>
        </div>
      </header>

      <div className="p-5">
        <BlockPreview block={block} onChange={onChange} />
      </div>

      {open && (
        <div className="border-t border-border bg-muted/20 p-5">
          <BlockPayloadEditor
            block={{ ...block, label: typeLabel(block.type), expanded: true }}
            onChange={(payload) => onChange({ ...block, payload })}
          />

          <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                checked={required}
                onChange={(e) => onChange({ ...block, required: e.target.checked })}
              />
              Required
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground">
              Points
              <input
                type="number"
                min={0}
                className="h-9 w-24 rounded-md border border-input bg-background px-2.5 text-sm"
                value={points || ''}
                onChange={(e) => onChange({ ...block, points: Number(e.target.value) || 0 })}
              />
              <span className="text-muted-foreground">XP</span>
            </label>
          </div>
        </div>
      )}
    </article>
  )
}

function IconButton({
  label, onClick, children, expanded,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      {...(expanded === undefined ? {} : { 'aria-expanded': expanded })}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

interface CanvasProps {
  blocks: BlockItem[]
  onBlocksChange: (blocks: BlockItem[]) => void
  header: React.ReactNode
}

export function BlockCanvas({ blocks, onBlocksChange, header }: CanvasProps) {
  const [picking, setPicking] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  function replaceAt(i: number, next: BlockItem) {
    onBlocksChange(blocks.map((b, idx) => (idx === i ? next : b)))
  }

  function duplicateAt(i: number) {
    const source = blocks[i]
    if (!source) return
    const copy: BlockItem = { ...source, id: `new-${crypto.randomUUID()}` }
    const next = [...blocks]
    next.splice(i + 1, 0, copy)
    onBlocksChange(next)
  }

  function removeAt(i: number) {
    onBlocksChange(blocks.filter((_, idx) => idx !== i))
  }

  function addBlock(type: string) {
    onBlocksChange([
      ...blocks,
      {
        id: `new-${crypto.randomUUID()}`,
        type,
        label: typeLabel(type),
        payload: {},
        required: false,
        points: 0,
        expanded: true,
      },
    ])
    setPicking(false)
  }

  function handleDragOver(e: React.DragEvent, target: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === target) return
    const next = [...blocks]
    const [moved] = next.splice(dragIndex, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    setDragIndex(target)
    onBlocksChange(next)
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4 px-6 py-8">
      {header}

      {blocks.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          onChange={(next) => replaceAt(i, next)}
          onDuplicate={() => duplicateAt(i)}
          onDelete={() => removeAt(i)}
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={() => setDragIndex(null)}
        />
      ))}

      {picking ? (
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Add a block</p>
            <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
              Cancel
            </Button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={() => addBlock(bt.type)}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', bt.color)}>
                  {bt.icon}
                </span>
                <span className="font-medium text-foreground">{bt.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Content
        </button>
      )}
    </div>
  )
}
