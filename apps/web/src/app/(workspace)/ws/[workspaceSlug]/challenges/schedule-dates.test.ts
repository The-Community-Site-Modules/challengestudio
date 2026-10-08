/**
 * Dates from the wizard are bare days ("2026-10-10"). They mean midnight on
 * the challenge's own clock, not UTC midnight — which for a New York cohort
 * was 8pm the evening before, opening every day a day early.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace: { findUnique: vi.fn() },
  challenge: { findFirst: vi.fn(), create: vi.fn() },
  messageTemplate: { createMany: vi.fn() },
  offer:     { create: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))
class RedirectError extends Error {}
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new RedirectError(to) } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({ requireUser: async () => ({ id: 'u1', email: 'a@b.c' }) }))
vi.mock('@/lib/permissions', () => ({ requirePermission: async () => undefined }))

const { createChallengeAction } = await import('./actions')

const WIZARD = {
  title: 'Sprint', slug: '', description: '', promise: '', outcome: '', startingPoint: '',
  successDefinition: '', mode: 'cohort', timezone: 'America/New_York',
  startsAt: '2026-10-10', endsAt: '2026-10-31',
  registrationOpensAt: '', registrationClosesAt: '2026-10-09',
  isPublic: true, maxParticipants: null, requiresApproval: false, settings: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1', slug: 'acme' })
  db.challenge.findFirst.mockResolvedValue(null)
  db.challenge.create.mockResolvedValue({ id: 'ch1', slug: 'sprint' })
})

async function create(over: Record<string, unknown> = {}) {
  try { await createChallengeAction('acme', { ...WIZARD, ...over }) } catch (e) { if (!(e instanceof RedirectError)) throw e }
  return db.challenge.create.mock.calls[0]?.[0]?.data
}

describe('wizard schedule dates', () => {
  it('reads a bare date as midnight in the challenge timezone', async () => {
    const data = await create()
    // Midnight EDT (UTC-4) on the 10th is 04:00 UTC — not 00:00 UTC.
    expect(data.startsAt.toISOString()).toBe('2026-10-10T04:00:00.000Z')
    expect(data.registrationClosesAt.toISOString()).toBe('2026-10-09T04:00:00.000Z')
    expect(data.registrationOpensAt).toBeNull()
  })

  it('keeps UTC for a challenge with no timezone', async () => {
    const data = await create({ timezone: '' })
    expect(data.startsAt.toISOString()).toBe('2026-10-10T00:00:00.000Z')
  })

  it('takes a full ISO instant as given', async () => {
    const data = await create({ startsAt: '2026-10-10T13:00:00.000Z' })
    expect(data.startsAt.toISOString()).toBe('2026-10-10T13:00:00.000Z')
  })
})

describe('slug for a title with no Latin letters', () => {
  it('falls back to a usable slug rather than "-2"', async () => {
    const data = await create({ title: 'تحدي ٣٠ يوم' })
    expect(data.slug).toBe('challenge')
  })
})

describe('challenge timezone', () => {
  it('refuses a timezone Intl cannot read, instead of storing it', async () => {
    // Every participant page formats dates with it; an unknown zone throws a
    // RangeError and takes the page down for every visitor.
    const result = await createChallengeAction('acme', { ...WIZARD, timezone: 'Mars/Olympus' })
    expect(result).toEqual({ error: expect.stringMatching(/timezone/) })
    expect(db.challenge.create).not.toHaveBeenCalled()
  })
})

describe('participant limit', () => {
  it.each([-5, 0, 2.5])('refuses %s', async (maxParticipants) => {
    // A negative limit made registration call the challenge full at once.
    const result = await createChallengeAction('acme', { ...WIZARD, maxParticipants })
    expect(result).toEqual({ error: expect.stringMatching(/limit/) })
    expect(db.challenge.create).not.toHaveBeenCalled()
  })

  it('accepts none, or a whole number', async () => {
    expect((await create({ maxParticipants: null })).maxParticipants).toBeNull()
    vi.clearAllMocks()
    db.workspace.findUnique.mockResolvedValue({ id: 'ws1', slug: 'acme' })
    db.challenge.findFirst.mockResolvedValue(null)
    db.challenge.create.mockResolvedValue({ slug: 'sprint' })
    expect((await create({ maxParticipants: 50 })).maxParticipants).toBe(50)
  })
})

describe('wizard communications and offer steps', () => {
  it('turns off the emails switched off in the wizard', async () => {
    // They were stored in settings and read by nothing, so they still sent.
    await create({ settings: { emailTriggers: { registration: true, daily: false, inactivity: false } } })
    const rows = db.messageTemplate.createMany.mock.calls[0]?.[0]?.data
    expect(rows).toEqual([
      { challengeId: 'ch1', trigger: 'day_available', enabled: false },
      { challengeId: 'ch1', trigger: 'inactivity_nudge', enabled: false },
    ])
  })

  it('writes nothing when every email is left on', async () => {
    await create({ settings: { emailTriggers: { registration: true } } })
    expect(db.messageTemplate.createMany).not.toHaveBeenCalled()
  })

  it('creates the offer the wizard described', async () => {
    await create({ settings: { offer: {
      enabled: true, headline: 'Join the program', ctaText: 'Enrol', url: 'https://example.com/buy',
      deadline: '2026-11-01T09:00', bonuses: 'Bonus call\n\nWorkbook ',
    } } })
    const data = db.offer.create.mock.calls[0]?.[0]?.data
    expect(data).toMatchObject({
      challengeId: 'ch1', enabled: true, headline: 'Join the program', ctaLabel: 'Enrol',
      ctaUrl: 'https://example.com/buy', bonuses: ['Bonus call', 'Workbook'],
    })
    // 09:00 in New York (EST after the clocks change) is 14:00 UTC.
    expect(data.closesAt.toISOString()).toBe('2026-11-01T14:00:00.000Z')
  })

  it.each([
    [{ enabled: false, headline: 'x', url: 'https://example.com' }],
    [{ enabled: true, headline: '', url: 'https://example.com' }],
    [{ enabled: true, headline: 'x', url: 'javascript:alert(1)' }],
  ])('creates no offer from an incomplete or unsafe one: %j', async (offer) => {
    await create({ settings: { offer } })
    expect(db.offer.create).not.toHaveBeenCalled()
  })
})
