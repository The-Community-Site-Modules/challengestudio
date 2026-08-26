import { describe, it, expect } from 'vitest'
import { validateStep, incompleteSteps } from './validation'
import type { WizardState } from './wizard-context'

/** A wizard that has been filled in correctly; tests break one field at a time. */
const COMPLETE: WizardState = {
  title: '5-Day Business Launch', slug: '5-day-business-launch',
  description: 'A focused sprint.', category: 'business',
  promise: 'Land your first client in 5 days.',
  outcome: 'Has a paying client.',
  startingPoint: 'An idea and no clients.',
  successDefinition: 'Made at least one offer.',
  timeCommitment: '30 minutes',
  mode: 'marketing',
  timezone: 'Asia/Karachi',
  startsAt: '2026-09-01', endsAt: '2026-09-05',
  registrationOpensAt: '2026-08-20', registrationClosesAt: '2026-08-31',
  unlockModel: 'fixed_calendar', gracePeriod: 'None',
  visibility: 'public', maxParticipants: '', requiresApproval: false,
  numDays: '5',
  features: { liveSessions: true, community: true, submissions: true, gamification: true, leaderboard: false, reflections: true },
  emailTriggers: { registration: true, start: true, daily: true, reminder: true, inactivity: true, completion: true },
  inactivityDays: '2 days',
  hasOffer: true,
  offerHeadline: 'Join the full program.',
  offerCtaText: 'Get instant access',
  offerUrl: 'https://example.com/offer',
  offerDeadline: '', offerBonuses: '',
}

const withState = (patch: Partial<WizardState>): WizardState => ({ ...COMPLETE, ...patch })

describe('a fully filled wizard', () => {
  it('reports no errors on any step', () => {
    for (let s = 1; s <= 8; s++) {
      expect(validateStep(s, COMPLETE), `step ${s}`).toEqual({})
    }
    expect(incompleteSteps(COMPLETE)).toEqual([])
  })
})

describe('step 1 — foundation', () => {
  it('requires a title', () => {
    expect(validateStep(1, withState({ title: '' }))).toHaveProperty('title')
    expect(validateStep(1, withState({ title: '   ' }))).toHaveProperty('title')
  })

  it('rejects a title of one or two characters', () => {
    expect(validateStep(1, withState({ title: 'ab' }))).toHaveProperty('title')
    expect(validateStep(1, withState({ title: 'abc' }))).not.toHaveProperty('title')
  })

  it('rejects a slug that is not url-safe', () => {
    for (const slug of ['Has Spaces', 'UPPER', 'trailing-', 'double--hyphen', 'sym$bol']) {
      expect(validateStep(1, withState({ slug })), slug).toHaveProperty('slug')
    }
  })

  it('accepts a lowercase hyphenated slug', () => {
    expect(validateStep(1, withState({ slug: 'five-day-launch-2' }))).not.toHaveProperty('slug')
  })
})

describe('step 2 — outcome', () => {
  it('requires the starting point, outcome and promise', () => {
    const errors = validateStep(2, withState({ startingPoint: '', outcome: '', promise: '' }))
    expect(Object.keys(errors).sort()).toEqual(['outcome', 'promise', 'startingPoint'])
  })

  it('leaves the optional fields alone', () => {
    const errors = validateStep(2, withState({ successDefinition: '', timeCommitment: '' }))
    expect(errors).toEqual({})
  })
})

describe('step 4 — schedule', () => {
  it('requires a start date', () => {
    expect(validateStep(4, withState({ startsAt: '' }))).toHaveProperty('startsAt')
  })

  it('allows a blank end date', () => {
    expect(validateStep(4, withState({ endsAt: '' }))).not.toHaveProperty('endsAt')
  })

  it('rejects an end date before the start', () => {
    expect(validateStep(4, withState({ startsAt: '2026-09-10', endsAt: '2026-09-01' })))
      .toHaveProperty('endsAt')
  })

  it('allows a same-day start and end', () => {
    expect(validateStep(4, withState({ startsAt: '2026-09-10', endsAt: '2026-09-10' })))
      .not.toHaveProperty('endsAt')
  })

  it('rejects registration closing before it opens', () => {
    expect(validateStep(4, withState({ registrationOpensAt: '2026-08-30', registrationClosesAt: '2026-08-01' })))
      .toHaveProperty('registrationClosesAt')
  })

  it('rejects registration opening after the challenge starts', () => {
    expect(validateStep(4, withState({ startsAt: '2026-09-01', registrationOpensAt: '2026-09-05', registrationClosesAt: '' })))
      .toHaveProperty('registrationOpensAt')
  })

  it('does not compare dates that are not both filled in', () => {
    const errors = validateStep(4, withState({ endsAt: '', registrationOpensAt: '', registrationClosesAt: '' }))
    expect(errors).toEqual({})
  })
})

describe('step 5 — audience', () => {
  it('treats a blank capacity as unlimited', () => {
    expect(validateStep(5, withState({ maxParticipants: '' }))).toEqual({})
  })

  it('rejects a capacity that is not a whole number of 1 or more', () => {
    for (const value of ['0', '-5', '2.5', 'lots']) {
      expect(validateStep(5, withState({ maxParticipants: value })), value).toHaveProperty('maxParticipants')
    }
  })

  it('accepts a positive whole capacity', () => {
    expect(validateStep(5, withState({ maxParticipants: '250' }))).toEqual({})
  })
})

describe('step 6 — experience', () => {
  it('requires a day count of at least 1', () => {
    for (const value of ['', '0', '-3', '1.5']) {
      expect(validateStep(6, withState({ numDays: value })), value).toHaveProperty('numDays')
    }
  })

  it('rejects a run longer than a year', () => {
    expect(validateStep(6, withState({ numDays: '400' }))).toHaveProperty('numDays')
    expect(validateStep(6, withState({ numDays: '365' }))).not.toHaveProperty('numDays')
  })
})

describe('step 7 — communications', () => {
  it('requires nothing, including with every email switched off', () => {
    const off = Object.fromEntries(Object.keys(COMPLETE.emailTriggers).map((k) => [k, false]))
    expect(validateStep(7, withState({ emailTriggers: off }))).toEqual({})
  })
})

describe('step 8 — conversion', () => {
  it('requires nothing when the offer is switched off', () => {
    const errors = validateStep(8, withState({
      hasOffer: false, offerHeadline: '', offerCtaText: '', offerUrl: '',
    }))
    expect(errors).toEqual({})
  })

  it('requires headline, button text and URL once the offer is on', () => {
    const errors = validateStep(8, withState({
      hasOffer: true, offerHeadline: '', offerCtaText: '', offerUrl: '',
    }))
    expect(Object.keys(errors).sort()).toEqual(['offerCtaText', 'offerHeadline', 'offerUrl'])
  })

  it('rejects a destination that is not a full http(s) URL', () => {
    for (const url of ['example.com', 'ftp://example.com/x', 'javascript:alert(1)', 'https://nodot']) {
      expect(validateStep(8, withState({ offerUrl: url })), url).toHaveProperty('offerUrl')
    }
  })

  it('accepts http and https destinations', () => {
    expect(validateStep(8, withState({ offerUrl: 'https://buy.example.com/a?b=1' }))).not.toHaveProperty('offerUrl')
    expect(validateStep(8, withState({ offerUrl: 'http://buy.example.com' }))).not.toHaveProperty('offerUrl')
  })

  it('rejects an unparseable deadline but allows a blank one', () => {
    expect(validateStep(8, withState({ offerDeadline: 'soon' }))).toHaveProperty('offerDeadline')
    expect(validateStep(8, withState({ offerDeadline: '' }))).not.toHaveProperty('offerDeadline')
  })
})

describe('incompleteSteps', () => {
  it('lists every step with something missing, in order', () => {
    const broken = withState({ title: '', promise: '', startsAt: '', numDays: '' })
    expect(incompleteSteps(broken)).toEqual([1, 2, 4, 6])
  })

  it('is what gates publishing — an empty wizard is never publishable', () => {
    const empty = withState({
      title: '', slug: '', promise: '', outcome: '', startingPoint: '',
      startsAt: '', numDays: '', offerHeadline: '', offerCtaText: '', offerUrl: '',
    })
    expect(incompleteSteps(empty).length).toBeGreaterThan(0)
  })
})
