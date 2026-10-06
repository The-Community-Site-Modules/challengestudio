'use client'

/**
 * A date field with a calendar that belongs to this app.
 *
 * `<input type="date">` hands the calendar to the browser, which renders its
 * own — a different one on every OS, in none of this product's type, spacing
 * or colour, and unstyleable from CSS. Fine for a form nobody looks at; wrong
 * on a screen where a creator is making decisions about their challenge.
 *
 * The value stays a plain `YYYY-MM-DD` string, the same shape the native input
 * produced, so every caller and every action behind them is unchanged.
 *
 * ── On parsing ──────────────────────────────────────────────────────────────
 *
 * Dates are built and read with local-time constructors, never `new Date(str)`
 * on a bare `YYYY-MM-DD`. That form is parsed as UTC midnight, which in any
 * zone behind UTC lands on the previous day — the same class of bug that put
 * this project's whole unlock schedule a day out once already.
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { cn } from '@/lib/utils'

/** 'YYYY-MM-DD' → a Date at local midnight. */
function fromISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [, y, mo, d] = m
  return new Date(Number(y), Number(mo) - 1, Number(d))
}

/** A Date → 'YYYY-MM-DD', read in local time. */
function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** 'YYYY-MM-DD' shifted by whole days, for callers expressing "the day after". */
export function addDaysISO(value: string, days: number): string {
  const date = fromISO(value)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return toISO(date)
}

/**
 * The month grid, shared by the date and date-and-time fields.
 *
 * Pulled out rather than copied: two calendars drift, and the one that drifts
 * is always the one nobody is looking at.
 */
function MonthGrid({
  month, setMonth, selected, outOfRange, onPick,
}: {
  month: Date
  setMonth: (fn: (m: Date) => Date) => void
  selected: Date | null
  outOfRange: (d: Date) => boolean
  onPick: (d: Date) => void
}) {
  const today = new Date()
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  return (
    <>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-foreground">
          {format(month, 'MMMM yyyy')}
        </p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selected ? isSameDay(day, selected) : false
          const isToday = isSameDay(day, today)
          const blocked = outOfRange(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPick(day)}
              disabled={blocked}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              className={cn(
                'flex h-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors',
                blocked
                  ? 'cursor-not-allowed text-muted-foreground/30 line-through'
                  : isSelected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : inMonth
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground/50 hover:bg-muted/60',
                isToday && !isSelected && !blocked && 'font-semibold text-primary ring-1 ring-primary/40'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </>
  )
}

/** Closes on an outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return ref
}

interface Props {
  id?: string
  /** 'YYYY-MM-DD', or '' for empty. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Earliest selectable day, inclusive. Anything before it is not clickable. */
  min?: string
  /** Latest selectable day, inclusive. */
  max?: string
}


export function DateField({
  id, value, onChange, placeholder = 'Pick a date', className, min, max,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = fromISO(value)
  const [month, setMonth] = useState<Date>(() => selected ?? new Date())
  const wrapRef = useDismiss(open, () => setOpen(false))

  // Reopening on a different value should land on that value's month, not on
  // wherever the reader last browsed to.
  useEffect(() => {
    if (open && selected) setMonth(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value])

  /**
   * Out of range days stay visible and stop being clickable, rather than being
   * removed from the grid. A calendar with holes in it is harder to read than
   * one with greyed days, and the greyed day is the answer to "why can I not
   * pick the 7th?" — removing it only raises the question.
   *
   * Compared as strings: `YYYY-MM-DD` sorts chronologically, so this needs no
   * date arithmetic and cannot drift by a timezone.
   */
  function outOfRange(date: Date): boolean {
    const iso = toISO(date)
    if (min && iso < min) return true
    if (max && iso > max) return true
    return false
  }

  const today = new Date()
  const todayAllowed = !outOfRange(today)

  function pick(date: Date) {
    if (outOfRange(date)) return
    onChange(toISO(date))
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !selected && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {selected ? format(selected, 'EEE d MMM yyyy') : placeholder}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[286px] rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <MonthGrid
            month={month}
            setMonth={setMonth}
            selected={selected}
            outOfRange={outOfRange}
            onPick={pick}
          />

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={!todayAllowed}
              className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:no-underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Date and time ───────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
/** Five-minute steps. Sixty options is a scroll; twelve is a glance. */
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

/** 'YYYY-MM-DDTHH:mm' → its two halves, either of which may be missing. */
function splitLocal(value: string): { date: string; time: string } {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(value)
  return { date: m?.[1] ?? '', time: m?.[2] ?? '' }
}

/**
 * A date and a time, in one control.
 *
 * Same value shape as `<input type="datetime-local">` — 'YYYY-MM-DDTHH:mm', a
 * wall clock carrying no zone — so every caller, and the timezone conversions
 * behind them, are unchanged. The clock is 24-hour, matching how the rest of
 * this app formats times.
 */
export function DateTimeField({
  id, value, onChange, placeholder = 'Pick a date and time', className, min, max,
}: Props) {
  const [open, setOpen] = useState(false)
  const { date, time } = splitLocal(value)
  const selected = fromISO(date)
  const [month, setMonth] = useState<Date>(() => selected ?? new Date())
  const wrapRef = useDismiss(open, () => setOpen(false))

  const hh = time ? (time.split(':')[0] ?? '09') : '09'
  const rawMinute = time ? (time.split(':')[1] ?? '00') : '00'
  const mm = MINUTES.includes(rawMinute) ? rawMinute : '00'

  useEffect(() => {
    if (open && selected) setMonth(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value])

  // `min`/`max` may carry a time; only the day part bounds the grid.
  function outOfRange(d: Date): boolean {
    const iso = toISO(d)
    if (min && iso < min.slice(0, 10)) return true
    if (max && iso > max.slice(0, 10)) return true
    return false
  }

  /** Writing either half keeps the other. A date with no time gets 09:00. */
  function write(nextDate: string, nextTime: string) {
    onChange(nextDate ? `${nextDate}T${nextTime || '09:00'}` : '')
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !selected && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {selected ? `${format(selected, 'EEE d MMM yyyy')}, ${time || '09:00'}` : placeholder}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date and time"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[286px] rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <MonthGrid
            month={month}
            setMonth={setMonth}
            selected={selected}
            outOfRange={outOfRange}
            onPick={(d) => write(toISO(d), time)}
          />

          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <select
                aria-label="Hour"
                value={hh}
                onChange={(e) => write(date, `${e.target.value}:${mm}`)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
              >
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="text-sm text-muted-foreground">:</span>
              <select
                aria-label="Minute"
                value={mm}
                onChange={(e) => write(date, `${hh}:${e.target.value}`)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
              >
                {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {!date && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Pick a day above — the time applies to it.
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
