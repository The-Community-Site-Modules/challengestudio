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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
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

interface Props {
  id?: string
  /** 'YYYY-MM-DD', or '' for empty. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DateField({ id, value, onChange, placeholder = 'Pick a date', className }: Props) {
  const [open, setOpen] = useState(false)
  const selected = fromISO(value)
  const [month, setMonth] = useState<Date>(() => selected ?? new Date())
  const wrapRef = useRef<HTMLDivElement>(null)

  // Reopening on a different value should land on that value's month, not on
  // wherever the reader last browsed to.
  useEffect(() => {
    if (open && selected) setMonth(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Whole weeks, so the grid is always seven across with no gaps to reason
  // about. Monday first, which is how a challenge week is counted.
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })

  const today = new Date()

  function pick(date: Date) {
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

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => pick(day)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors',
                    isSelected
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : inMonth
                        ? 'text-foreground hover:bg-muted'
                        : 'text-muted-foreground/50 hover:bg-muted/60',
                    isToday && !isSelected && 'font-semibold text-primary ring-1 ring-primary/40'
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(today)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
