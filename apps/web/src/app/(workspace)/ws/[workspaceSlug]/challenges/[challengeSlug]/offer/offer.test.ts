/**
 * Offer clicks are counted for the creator. The click is attributed from the
 * session, never from an id the browser sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  offer:       { findUnique: vi.fn(), upsert: vi.fn() },
  workspace:   { findUnique: vi.fn() },
  challenge:   { findUnique: vi.fn() },
  offerClick:  { create: vi.fn() },
  participant: { findUnique: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(to) } }))

const session = { user: null as { id: string } | null }
vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => session.user,
  getCurrentUser: async () => session.user,
}))
vi.mock('@/lib/permissions', () => ({ requirePermission: async () => undefined }))

const { recordOfferClickAction, saveOfferAction } = await import('./actions')

beforeEach(() => {
  vi.clearAllMocks()
  session.user = null
  db.offer.findUnique.mockResolvedValue({ id: 'o1', enabled: true, challengeId: 'ch1' })
  db.participant.findUnique.mockResolvedValue(null)
})

describe('recordOfferClickAction', () => {
  it('counts an anonymous click without a participant', async () => {
    await recordOfferClickAction('o1')
    expect(db.offerClick.create).toHaveBeenCalledWith({ data: { offerId: 'o1' } })
  })

  it('attributes the click to the signed-in participant of that challenge', async () => {
    session.user = { id: 'u1' }
    db.participant.findUnique.mockResolvedValue({ id: 'p1' })
    await recordOfferClickAction('o1')
    expect(db.participant.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { challengeId_profileId: { challengeId: 'ch1', profileId: 'u1' } },
    }))
    expect(db.offerClick.create).toHaveBeenCalledWith({ data: { offerId: 'o1', participantId: 'p1' } })
  })

  it('ignores any participant id the browser tries to send', async () => {
    // @ts-expect-error — the old signature took one; a caller can still send it.
    await recordOfferClickAction('o1', 'someone-elses-participant')
    expect(db.offerClick.create).toHaveBeenCalledWith({ data: { offerId: 'o1' } })
  })

  it('counts nothing for a disabled offer', async () => {
    db.offer.findUnique.mockResolvedValue({ id: 'o1', enabled: false, challengeId: 'ch1' })
    expect(await recordOfferClickAction('o1')).toEqual({ success: false })
    expect(db.offerClick.create).not.toHaveBeenCalled()
  })
})

describe('saveOfferAction', () => {
  const input = (over: Record<string, unknown> = {}) => ({
    enabled: true, headline: 'Next', body: '', ctaLabel: 'Go',
    ctaUrl: 'https://example.com', bonuses: '', closesAt: '', ...over,
  })

  beforeEach(() => {
    session.user = { id: 'u1' }
    db.workspace.findUnique.mockResolvedValue({ id: 'ws1' })
    db.challenge.findUnique.mockResolvedValue({ id: 'ch1', timezone: 'Asia/Karachi' })
  })

  it('clears bonuses when every line is removed', async () => {
    // undefined means "leave as is" to Prisma, so the old list survived.
    await saveOfferAction('acme', 'sprint', input())
    expect(db.offer.upsert.mock.calls[0]?.[0]?.update?.bonuses).toEqual([])
  })

  it('reads the closing time in the challenge timezone', async () => {
    await saveOfferAction('acme', 'sprint', input({ closesAt: '2026-10-10T10:00' }))
    expect(db.offer.upsert.mock.calls[0]?.[0]?.update?.closesAt?.toISOString()).toBe('2026-10-10T05:00:00.000Z')
  })
})
