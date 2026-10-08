/**
 * Wall-clock times in a challenge's own timezone.
 *
 * The date-time picker produces "YYYY-MM-DDTHH:mm" with no zone. Parsed with
 * `new Date()` on the server that means server-local time — UTC on Vercel —
 * so a creator in Karachi scheduling a 10:00 call got one at 15:00 their time.
 * The challenge settings page already read these in the challenge's timezone;
 * live sessions and the offer deadline did not. Both directions live here.
 */

/** The zone's offset from UTC at an instant, in milliseconds. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0')
  const hour = get('hour') === 24 ? 0 : get('hour')
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  return asIfUtc - at.getTime()
}

/**
 * Whether Intl knows this IANA zone. Checked before a timezone is stored:
 * the participant pages format dates with it directly, and an unknown zone
 * throws a RangeError that takes the whole page down for every visitor.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function safeZone(timeZone: string | null | undefined): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : 'UTC'
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/**
 * "YYYY-MM-DDTHH:mm" read as a wall-clock time in `timeZone`, as an instant.
 * A string that already carries a zone (an ISO instant) is taken as-is.
 * Returns null for anything unreadable.
 */
export function zonedLocalToDate(local: string, timeZone: string | null | undefined): Date | null {
  const value = local.trim()
  const m = LOCAL.exec(value)
  if (!m) {
    const parsed = new Date(value)
    return value && !Number.isNaN(parsed.getTime()) ? parsed : null
  }
  const [year, month, day, hour, minute, second] = [+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0)]
  // Date.UTC rolls 2026-13-45 over into 2027 rather than refusing it.
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day ||
      hour > 23 || minute > 59 || second > 59) {
    return null
  }
  const zone = safeZone(timeZone)
  const naive = Date.UTC(year, month - 1, day, hour, minute, second)
  // Two passes, so a time near a DST change uses the offset in force then.
  const first = new Date(naive - zoneOffsetMs(new Date(naive), zone))
  return new Date(naive - zoneOffsetMs(first, zone))
}

/**
 * Format a challenge date on the challenge's own calendar.
 *
 * `toLocaleDateString()` on the server uses the server's zone — UTC in
 * production. Midnight in Karachi is 19:00 UTC the day before, so a challenge
 * starting on the 10th was announced, on its page and in its emails, as
 * starting on the 9th.
 */
export function formatInZone(
  d: Date,
  timeZone: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale: string | undefined = 'en-US'
): string {
  return d.toLocaleString(locale, { ...options, timeZone: safeZone(timeZone) })
}

/** An instant as "YYYY-MM-DDTHH:mm" on the wall clock of `timeZone`. */
export function dateToZonedLocal(d: Date, timeZone: string | null | undefined): string {
  const shifted = new Date(d.getTime() + zoneOffsetMs(d, safeZone(timeZone)))
  return shifted.toISOString().slice(0, 16)
}
