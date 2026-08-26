'use client'

interface Bar {
  label: string
  value: number
  max?: number
}

interface MiniBarChartProps {
  bars: Bar[]
  height?: number
  color?: string
  showLabels?: boolean
  showValues?: boolean
}

export function MiniBarChart({
  bars,
  height = 120,
  color = 'hsl(var(--primary))',
  showLabels = true,
  showValues = false,
}: MiniBarChartProps) {
  const max = Math.max(...bars.map(b => b.value), 1)

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {bars.map((bar) => {
          const pct = (bar.value / max) * 100
          return (
            // h-full + justify-end gives the bar's percentage height something
            // to resolve against. Without it the column collapses to its content
            // and every bar computes to 0px, however large its value.
            <div key={bar.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
              {showValues && (
                <span className="text-[10px] font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.value}
                </span>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                title={`${bar.label}: ${bar.value}`}
              />
            </div>
          )
        })}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex gap-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground truncate block">{bar.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
