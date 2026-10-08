/**
 * Consecutive days with at least one submission, counting back from today.
 *
 * Derived from timestamps rather than stored, so it cannot drift out of step
 * with the submissions it describes (Build Plan data rule 2).
 *
 * "Day" means a calendar day in the challenge's own timezone. There used to be
 * three copies of this, all using the server's local time — UTC on Vercel — so
 * someone in Karachi submitting at 2am local time was counted on the previous
 * day and could lose a streak they had kept.
 */
export function streakDays(submittedAt: Date[], timeZone: string, now = new Date()): number {
  const zone = validZone(timeZone)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  // en-CA formats as YYYY-MM-DD.
  const days = new Set(submittedAt.map((d) => fmt.format(new Date(d))))

  // Walk back by calendar date, not by 24-hour steps, so a DST change cannot
  // skip or repeat a day.
  const [y, m, d] = fmt.format(now).split('-').map(Number) as [number, number, number]
  let streak = 0
  for (;;) {
    const key = new Date(Date.UTC(y, m - 1, d - streak)).toISOString().slice(0, 10)
    if (!days.has(key)) return streak
    streak++
  }
}

function validZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return 'UTC'
  }
}
