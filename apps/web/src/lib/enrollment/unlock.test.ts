/**
 * Unlock maths (Build Plan §28: "schedule/unlock math").
 *
 * The rule these mostly exist to defend is data rule 3 — dates are stored in
 * UTC and the *challenge's* timezone is applied when deciding what is open.
 * The old inline version ignored the zone entirely and used the server's, so
 * the same challenge unlocked at different moments depending on where it was
 * deployed. Several of these tests fail if that regresses.
 */

import { describe, it, expect } from 'vitest'
import { calculateUnlocks, type UnlockInput, type ChallengeMode, normaliseMidnightHour } from './unlock'

const step = (order: number, availableAt: Date | null = null) => ({
  id: `s${order}`, order, availableAt,
})

/** A five-day challenge; each test moves one dial. */
function input(over: Partial<UnlockInput> = {}): UnlockInput {
  return {
    mode: 'COHORT',
    timezone: 'UTC',
    challengeStartsAt: new Date('2026-03-01T00:00:00Z'),
    enrolledAt: new Date('2026-03-01T00:00:00Z'),
    now: new Date('2026-03-01T12:00:00Z'),
    steps: [step(0), step(1), step(2), step(3), step(4)],
    ...over,
  }
}

const openIds = (i: UnlockInput) =>
  calculateUnlocks(i).filter((u) => u.unlocked).map((u) => u.id)

describe('day-by-day progression', () => {
  it('opens only day 1 on the first day', () => {
    expect(openIds(input())).toEqual(['s0'])
  })

  it('opens day 3 once the third day has begun', () => {
    expect(openIds(input({ now: new Date('2026-03-03T00:00:00Z') })))
      .toEqual(['s0', 's1', 's2'])
  })

  it('keeps day 3 shut a second before its midnight', () => {
    expect(openIds(input({ now: new Date('2026-03-02T23:59:59Z') })))
      .toEqual(['s0', 's1'])
  })

  it('has everything open once the challenge is over', () => {
    expect(openIds(input({ now: new Date('2026-04-01T00:00:00Z') })))
      .toHaveLength(5)
  })

  it('reports when a locked step opens', () => {
    const [, second] = calculateUnlocks(input())
    expect(second!.unlocked).toBe(false)
    expect(second!.unlocksAt?.toISOString()).toBe('2026-03-02T00:00:00.000Z')
  })
})

describe('the challenge timezone decides the day boundary', () => {
  // Both challenges start at local midnight on 1 March in their own zone, so
  // both are on their day 3 boundary at different UTC instants. The server's
  // own zone must not enter into it.
  const now = new Date('2026-03-02T19:00:00Z')

  it('opens day 3 where local midnight has passed', () => {
    // Auckland is UTC+13 in March: day 3 opened at 11:00Z.
    expect(openIds(input({
      timezone: 'Pacific/Auckland',
      challengeStartsAt: new Date('2026-02-28T11:00:00Z'),   // 1 Mar 00:00 NZDT
      now,
    }))).toEqual(['s0', 's1', 's2'])
  })

  it('holds day 3 back where it has not', () => {
    // New York is UTC-5 here: day 3 does not open until 05:00Z on the 3rd.
    expect(openIds(input({
      timezone: 'America/New_York',
      challengeStartsAt: new Date('2026-03-01T05:00:00Z'),   // 1 Mar 00:00 EST
      now,
    }))).toEqual(['s0', 's1'])
  })

  it('anchors to the local date the start instant falls on', () => {
    // 00:00Z on 1 March is still 28 February in New York, so that is day 1 —
    // the zone decides which calendar day the anchor belongs to.
    const [first] = calculateUnlocks(input({
      timezone: 'America/New_York',
      challengeStartsAt: new Date('2026-03-01T00:00:00Z'),
    }))
    expect(first!.unlocksAt?.toISOString()).toBe('2026-02-28T05:00:00.000Z')
  })

  it('unlocks at local midnight, not UTC midnight', () => {
    const [, second] = calculateUnlocks(input({ timezone: 'Asia/Karachi' }))
    // Karachi is UTC+5, so its midnight on the 2nd is 19:00Z on the 1st.
    expect(second!.unlocksAt?.toISOString()).toBe('2026-03-01T19:00:00.000Z')
  })

  it('falls back to UTC for a zone it does not recognise', () => {
    expect(openIds(input({ timezone: 'Mars/Olympus_Mons' }))).toEqual(['s0'])
  })
})

describe('daylight saving', () => {
  // US clocks go forward on 2026-03-08. A challenge starting on the 6th has
  // its day boundary shift by an hour in UTC partway through.
  const dst = input({
    timezone: 'America/New_York',
    challengeStartsAt: new Date('2026-03-06T05:00:00Z'),   // local midnight, EST
    now: new Date('2026-03-20T00:00:00Z'),
  })

  it('keeps each unlock at local midnight across the change', () => {
    const at = calculateUnlocks(dst).map((u) => u.unlocksAt!.toISOString())
    expect(at[0]).toBe('2026-03-06T05:00:00.000Z')   // EST, UTC-5
    expect(at[1]).toBe('2026-03-07T05:00:00.000Z')   // EST
    expect(at[2]).toBe('2026-03-08T05:00:00.000Z')   // the day itself
    expect(at[3]).toBe('2026-03-09T04:00:00.000Z')   // EDT, UTC-4
    expect(at[4]).toBe('2026-03-10T04:00:00.000Z')   // EDT
  })
})

describe('what each mode anchors to', () => {
  // Someone who joined late. Cohort modes should still place them on the
  // challenge's calendar; self-paced ones on their own.
  const late = {
    challengeStartsAt: new Date('2026-03-01T00:00:00Z'),
    enrolledAt:        new Date('2026-03-10T00:00:00Z'),
    now:               new Date('2026-03-11T12:00:00Z'),
  }

  const cohortish: ChallengeMode[] = ['COHORT', 'SPRINT', 'LIVE_EVENT', 'DRIP']
  for (const mode of cohortish) {
    it(`${mode} runs on the challenge's calendar`, () => {
      // Eleven days in, so all five days are long since open.
      expect(openIds(input({ ...late, mode }))).toHaveLength(5)
    })
  }

  const personal: ChallengeMode[] = ['SELF_PACED', 'EVERGREEN']
  for (const mode of personal) {
    it(`${mode} runs from the participant's own enrolment`, () => {
      // Their personal day 2 — the challenge's start date is irrelevant.
      expect(openIds(input({ ...late, mode }))).toEqual(['s0', 's1'])
    })
  }
})

describe('an explicit date on a step', () => {
  it('wins over the mode', () => {
    const i = input({
      steps: [step(0), step(1, new Date('2026-03-01T09:00:00Z')), step(2)],
    })
    // Day 2 would normally wait for the 2nd; its own date has passed.
    expect(openIds(i)).toEqual(['s0', 's1'])
  })

  it('can hold a step back that the schedule would have opened', () => {
    const i = input({
      now: new Date('2026-03-05T00:00:00Z'),
      steps: [step(0), step(1, new Date('2026-04-01T00:00:00Z'))],
    })
    expect(openIds(i)).toEqual(['s0'])
  })
})

describe('a challenge with no start date', () => {
  it('opens everything rather than stranding the participant', () => {
    const i = input({ mode: 'COHORT', challengeStartsAt: null })
    expect(openIds(i)).toHaveLength(5)
    expect(calculateUnlocks(i)[0]!.unlocksAt).toBeNull()
  })
})

describe('day 1', () => {
  it('opens as soon as a cohort starts, even mid-morning', () => {
    const i = input({
      challengeStartsAt: new Date('2026-03-01T09:30:00Z'),
      now:               new Date('2026-03-01T10:00:00Z'),
    })
    expect(openIds(i)).toEqual(['s0'])
  })

  it('stays shut before the cohort starts', () => {
    const i = input({
      challengeStartsAt: new Date('2026-03-05T09:30:00Z'),
      now:               new Date('2026-03-01T10:00:00Z'),
    })
    expect(openIds(i)).toEqual([])
  })
})

describe('midnight, as engines report it', () => {
  /**
   * This is the bug that made CI fail on every commit from Milestone 5 to
   * Milestone 11 while the same tests passed on the machine they were written
   * on. With `hour12: false`, Node 20's ICU formats midnight as hour 24;
   * Node 24's formats it as 0. Passing 24 to Date.UTC rolls the date forward,
   * so the zone offset came out 24 hours wrong and every unlock landed a day
   * early.
   *
   * It cannot be reproduced on an engine that reports 0, which is exactly why
   * it survived for six milestones. So the clamp is tested directly rather
   * than through a formatter whose behaviour depends on the runtime.
   */
  it('treats hour 24 as hour 0', () => {
    expect(normaliseMidnightHour(24)).toBe(0)
  })

  it('leaves every real hour alone', () => {
    for (let hour = 0; hour <= 23; hour++) {
      expect(normaliseMidnightHour(hour)).toBe(hour)
    }
  })

  it('is what stops a day-wide error in the offset', () => {
    // Date.UTC(2026, 1, 28, 24) is 1 March, not 28 February. That single
    // rollover is the whole bug.
    const rolled = Date.UTC(2026, 1, 28, 24, 0, 0)
    const clamped = Date.UTC(2026, 1, 28, normaliseMidnightHour(24), 0, 0)
    expect(rolled - clamped).toBe(86_400_000)
  })

  it('asks the formatter for a 0-23 clock in the first place', () => {
    // The clamp is the safety net; hourCycle is the fix. If someone reverts
    // to hour12:false this still passes, which is why the clamp is kept.
    const midnightNewYork = new Date('2026-02-28T05:00:00Z')
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit',
    }).formatToParts(midnightNewYork).find(part => part.type === 'hour')?.value

    expect(Number(hour)).toBeLessThan(24)
  })
})
