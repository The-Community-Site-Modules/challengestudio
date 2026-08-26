'use client'

import { useId, useMemo, useState } from 'react'

export interface TimePoint {
  /** ISO date, yyyy-mm-dd */
  date: string
  value: number
}

interface Props {
  data: TimePoint[]
  /** Names the single series, so no legend box is needed. */
  seriesLabel: string
  /** Viewbox height. Small multiples want less than a standalone chart. */
  height?: number
  emptyMessage?: string
}

const W = 520
const DEFAULT_H = 240
const PAD = { top: 16, right: 10, bottom: 30, left: 40 }

/** Pick a 1/2/5×10ⁿ step that yields roughly three or four gridlines. */
function niceStep(max: number) {
  const raw = Math.max(1, max) / 3
  const mag = 10 ** Math.floor(Math.log10(raw))
  for (const m of [1, 2, 5, 10]) if (raw <= m * mag) return m * mag
  return 10 * mag
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * Registrations per day.
 *
 * One series, so the heading names it and no legend box is needed. A crosshair
 * finds the X — readers aim at a date, never at a 2px line — and every value the
 * tooltip shows is also in the table below, which is what keeps the chart usable
 * on keyboard and without a pointer.
 */
export function TimeSeriesChart({ data, seriesLabel, height, emptyMessage }: Props) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const H = height ?? DEFAULT_H

  const { points, ticks, path, area } = useMemo(() => {
    const maxValue = Math.max(1, ...data.map((d) => d.value))
    // Scale to the rounded top, not the raw max, so the curve and the gridlines
    // share one scale — otherwise the last gridline is not where the peak is.
    const tickStep = niceStep(maxValue)
    const top = Math.ceil(maxValue / tickStep) * tickStep
    const scale: number[] = []
    for (let t = 0; t <= top; t += tickStep) scale.push(t)

    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const gap = data.length > 1 ? innerW / (data.length - 1) : 0

    const pts = data.map((d, i) => ({
      ...d,
      x: PAD.left + i * gap,
      y: PAD.top + innerH - (d.value / top) * innerH,
    }))

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    const baseline = PAD.top + innerH
    const fill = pts.length
      ? `${line} L${pts[pts.length - 1]!.x.toFixed(2)},${baseline} L${pts[0]!.x.toFixed(2)},${baseline} Z`
      : ''

    return { points: pts, ticks: scale.map((t) => ({ value: t, ratio: t / top })), path: line, area: fill }
  }, [data, H])

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? 'Nothing to show for this period yet.'}
      </p>
    )
  }

  const active = hover !== null ? points[hover] : null

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${seriesLabel} over the last ${data.length} days`}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = ((e.clientX - rect.left) / rect.width) * W
            let nearest = 0
            let best = Infinity
            points.forEach((p, i) => {
              const d = Math.abs(p.x - x)
              if (d < best) { best = d; nearest = i }
            })
            setHover(nearest)
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="hsl(var(--primary))" stopOpacity="0.28" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive grid — reference, not data */}
          {ticks.map((t) => {
            const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - t.ratio)
            return (
              <g key={t.value}>
                <line
                  x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
                  stroke="hsl(var(--border))" strokeWidth="1"
                />
                <text
                  x={PAD.left - 6} y={y + 3} textAnchor="end"
                  className="fill-muted-foreground text-[11px]"
                >
                  {t.value}
                </text>
              </g>
            )
          })}

          <path d={area} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair snaps to the nearest date */}
          {active && (
            <>
              <line
                x1={active.x} x2={active.x} y1={PAD.top} y2={H - PAD.bottom}
                stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 3"
              />
              {/* 2px surface ring keeps the marker legible over the fill */}
              <circle cx={active.x} cy={active.y} r="5"
                      fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
            </>
          )}

          {/* First and last dates only — a label per point is noise */}
          <text x={PAD.left} y={H - 8} className="fill-muted-foreground text-[11px]">
            {formatDay(data[0]!.date)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">
            {formatDay(data[data.length - 1]!.date)}
          </text>
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md"
            style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
          >
            {/* Value leads, label follows — the reader already has the series */}
            <p className="text-sm font-semibold leading-none text-foreground">{active.value}</p>
            <p className="mt-1 whitespace-nowrap text-[11px] leading-none text-muted-foreground">
              {formatDay(active.date)}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        aria-expanded={showTable}
      >
        {showTable ? 'Hide values' : 'View values'}
      </button>

      {showTable && (
        <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">{seriesLabel} by day</caption>
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 text-left font-medium">Date</th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-medium">{seriesLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="px-2.5 py-1 text-muted-foreground">{formatDay(d.date)}</td>
                  <td className="px-2.5 py-1 text-right tabular-nums text-foreground">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
