import { describe, it, expect } from 'vitest'
import { streakDays } from './streak'

const NOW = new Date('2026-03-10T12:00:00Z')

describe('streakDays', () => {
  it('counts consecutive days back from today', () => {
    const dates = ['2026-03-10T09:00:00Z', '2026-03-09T09:00:00Z', '2026-03-08T09:00:00Z']
    expect(streakDays(dates.map(d => new Date(d)), 'UTC', NOW)).toBe(3)
  })

  it('stops at the first missing day', () => {
    const dates = ['2026-03-10T09:00:00Z', '2026-03-08T09:00:00Z']
    expect(streakDays(dates.map(d => new Date(d)), 'UTC', NOW)).toBe(1)
  })

  it('is zero with nothing today', () => {
    expect(streakDays([new Date('2026-03-09T09:00:00Z')], 'UTC', NOW)).toBe(0)
  })

  it('uses the challenge timezone, not the server’s', () => {
    // 20:30 UTC on the 9th is 01:30 on the 10th in Karachi (UTC+5). In UTC
    // that is the 9th; in the challenge's zone, it is today.
    const lateNight = [new Date('2026-03-09T20:30:00Z')]
    expect(streakDays(lateNight, 'Asia/Karachi', NOW)).toBe(1)
    expect(streakDays(lateNight, 'UTC', NOW)).toBe(0)
  })

  it('falls back to UTC for an unknown zone rather than throwing', () => {
    expect(streakDays([NOW], 'Not/AZone', NOW)).toBe(1)
  })
})
