import { describe, it, expect } from 'vitest'
import { dateToZonedLocal, formatInZone, isValidTimeZone, zonedLocalToDate } from './zoned'

describe('zonedLocalToDate', () => {
  it('reads a wall-clock time in the challenge timezone, not the server’s', () => {
    // 10:00 in Karachi (UTC+5) is 05:00 UTC.
    expect(zonedLocalToDate('2026-10-10T10:00', 'Asia/Karachi')?.toISOString())
      .toBe('2026-10-10T05:00:00.000Z')
  })

  it('handles a zone with daylight saving on either side of the change', () => {
    // New York: EDT (UTC-4) in July, EST (UTC-5) in January.
    expect(zonedLocalToDate('2026-07-01T09:00', 'America/New_York')?.toISOString())
      .toBe('2026-07-01T13:00:00.000Z')
    expect(zonedLocalToDate('2026-01-15T09:00', 'America/New_York')?.toISOString())
      .toBe('2026-01-15T14:00:00.000Z')
  })

  it('takes an ISO instant as-is', () => {
    expect(zonedLocalToDate('2026-10-10T10:00:00.000Z', 'Asia/Karachi')?.toISOString())
      .toBe('2026-10-10T10:00:00.000Z')
  })

  it('falls back to UTC for a missing or unknown zone', () => {
    expect(zonedLocalToDate('2026-10-10T10:00', null)?.toISOString()).toBe('2026-10-10T10:00:00.000Z')
    expect(zonedLocalToDate('2026-10-10T10:00', 'Not/AZone')?.toISOString()).toBe('2026-10-10T10:00:00.000Z')
  })

  it.each(['', 'tomorrow', '2026-13-45T99:99x', '2026-13-01T10:00', '2026-02-30T10:00', '2026-01-01T24:00'])('returns null for %j', (value) => {
    expect(zonedLocalToDate(value, 'UTC')).toBeNull()
  })
})

describe('dateToZonedLocal', () => {
  it('shows an instant on the challenge’s wall clock', () => {
    expect(dateToZonedLocal(new Date('2026-10-10T05:00:00Z'), 'Asia/Karachi')).toBe('2026-10-10T10:00')
  })

  it('round-trips with zonedLocalToDate', () => {
    const local = '2026-03-08T01:30'
    const zone = 'America/Los_Angeles'
    expect(dateToZonedLocal(zonedLocalToDate(local, zone)!, zone)).toBe(local)
  })
})

describe('isValidTimeZone', () => {
  it.each(['UTC', 'Asia/Karachi', 'America/New_York'])('accepts %s', (zone) => {
    expect(isValidTimeZone(zone)).toBe(true)
  })
  it.each(['', 'Mars/Olympus', 'not a zone'])('refuses %j', (zone) => {
    expect(isValidTimeZone(zone)).toBe(false)
  })
})

describe('formatInZone', () => {
  it('shows the date on the challenge calendar, not the server’s', () => {
    // Midnight on the 10th in Karachi is 19:00 UTC on the 9th.
    const start = new Date('2026-10-09T19:00:00Z')
    expect(formatInZone(start, 'Asia/Karachi', { month: 'long', day: 'numeric' })).toBe('October 10')
    expect(formatInZone(start, 'UTC', { month: 'long', day: 'numeric' })).toBe('October 9')
  })

  it('falls back to UTC for a missing or unknown zone instead of throwing', () => {
    const d = new Date('2026-10-09T19:00:00Z')
    expect(formatInZone(d, null, { day: 'numeric' })).toBe('9')
    expect(formatInZone(d, 'Mars/Olympus', { day: 'numeric' })).toBe('9')
  })
})
