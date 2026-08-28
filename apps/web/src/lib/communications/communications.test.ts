/**
 * Trigger evaluation and delivery (PRD §27, §15.2).
 *
 * §27 promises three things about transactional mail: it is sent once, its
 * failures are observable, and unsubscribe rules are respected. Each of these
 * tests exists to hold one of those promises, and §15.2's warning — that
 * unsubscribing from one workspace must not silence another — gets its own.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  messageDelivery:        { create: vi.fn(), update: vi.fn() },
  messageTemplate:        { findUnique: vi.fn() },
  notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

interface SentMessage { to: string; subject: string; text: string; html: string; trigger: string }
interface SendOutcome { sent: boolean; provider: 'resend' | 'console'; reason?: string }
const sendEmail = vi.fn<(m: SentMessage) => Promise<SendOutcome>>(
  async () => ({ sent: true, provider: 'resend' })
)
vi.mock('@/lib/email', () => ({ sendEmail }))

const { dispatch, setUnsubscribed } = await import('./send')
const { render, MESSAGES, isEssential } = await import('./catalogue')

class UniqueViolation extends Error { code = 'P2002' }

const input = (over: Record<string, unknown> = {}) => ({
  trigger: 'completion' as const,
  workspaceId: 'ws1',
  challengeId: 'ch1',
  participantId: 'p1',
  profileId: 'u1',
  to: 'ada@example.com',
  idempotencyKey: 'p1:completion',
  values: { participantName: 'Ada', challengeTitle: 'Design Sprint' },
  ...over,
})

const statusWritten = () => db.messageDelivery.update.mock.calls[0]?.[0]?.data?.status

beforeEach(() => {
  vi.clearAllMocks()
  db.messageDelivery.create.mockResolvedValue({ id: 'd1' })
  db.messageDelivery.update.mockResolvedValue({})
  db.messageTemplate.findUnique.mockResolvedValue(null)
  db.notificationPreference.findUnique.mockResolvedValue(null)
  sendEmail.mockResolvedValue({ sent: true, provider: 'resend' })
})

describe('sent once', () => {
  it('sends and logs it', async () => {
    expect(await dispatch(input())).toEqual({ status: 'sent' })
    expect(sendEmail).toHaveBeenCalledOnce()
    expect(statusWritten()).toBe('sent')
  })

  it('claims the key before sending, so a repeat never reaches the provider', async () => {
    db.messageDelivery.create.mockRejectedValue(new UniqueViolation())
    expect(await dispatch(input())).toEqual({ status: 'duplicate' })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('does not swallow a real database failure as a duplicate', async () => {
    db.messageDelivery.create.mockRejectedValue(new Error('connection lost'))
    await expect(dispatch(input())).rejects.toThrow('connection lost')
  })
})

describe('failures are observable', () => {
  it('records a failed send with the provider reason', async () => {
    sendEmail.mockResolvedValue({ sent: false, provider: 'console', reason: 'no api key' })
    const result = await dispatch(input())
    expect(result.status).toBe('failed')
    const data = db.messageDelivery.update.mock.calls[0]?.[0]?.data
    expect(data.status).toBe('failed')
    expect(data.error).toBe('no api key')
  })

  it('records a deliberate skip too, so "did it go out?" has an answer', async () => {
    db.notificationPreference.findUnique.mockResolvedValue({ unsubscribed: true })
    expect((await dispatch(input())).status).toBe('skipped_unsubscribed')
    expect(statusWritten()).toBe('skipped_unsubscribed')
  })
})

describe('unsubscribe', () => {
  it('silences a non-essential message', async () => {
    db.notificationPreference.findUnique.mockResolvedValue({ unsubscribed: true })
    expect((await dispatch(input())).status).toBe('skipped_unsubscribed')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('never silences access mail, whatever the preference says', async () => {
    // §15.2: security, access and legally required messages always go.
    db.notificationPreference.findUnique.mockResolvedValue({ unsubscribed: true })
    const result = await dispatch(input({
      trigger: 'account_setup',
      values: { participantName: 'Ada', actionUrl: 'https://example.com/x' },
    }))
    expect(result.status).toBe('sent')
    expect(sendEmail).toHaveBeenCalled()
  })

  it('is asked for against one workspace only', async () => {
    // The warning in §15.2 is precisely that opting out of one workspace must
    // not unsubscribe someone from another.
    await dispatch(input())
    expect(db.notificationPreference.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId_workspaceId: { profileId: 'u1', workspaceId: 'ws1' } },
      })
    )
  })

  it('writes the preference against that pair and no other', async () => {
    await setUnsubscribed('u1', 'ws1', true)
    const call = db.notificationPreference.upsert.mock.calls[0]?.[0]
    expect(call.where).toEqual({ profileId_workspaceId: { profileId: 'u1', workspaceId: 'ws1' } })
    expect(call.create).toEqual({ profileId: 'u1', workspaceId: 'ws1', unsubscribed: true })
  })
})

describe('creator control', () => {
  it('does not send a message the creator turned off', async () => {
    db.messageTemplate.findUnique.mockResolvedValue({ enabled: false, subject: null, body: null })
    expect((await dispatch(input())).status).toBe('skipped_disabled')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('uses the creator’s wording when they have set some', async () => {
    db.messageTemplate.findUnique.mockResolvedValue({
      enabled: true, subject: 'Well done {{participantName}}', body: 'You did it.',
    })
    await dispatch(input())
    expect(sendEmail.mock.calls[0]?.[0]?.subject).toBe('Well done Ada')
  })

  it('falls back to the default when they have not', async () => {
    await dispatch(input())
    expect(sendEmail.mock.calls[0]?.[0]?.subject).toBe('You finished Design Sprint')
  })
})

describe('template variables', () => {
  it('substitutes the ones this message declares', () => {
    expect(render('Hi {{participantName}}', 'completion', { participantName: 'Ada' }))
      .toBe('Hi Ada')
  })

  it('leaves an undeclared name standing rather than substituting it', () => {
    // A visible {{secret}} is a bug someone fixes; a leaked value is not.
    expect(render('{{secret}}', 'completion', { secret: 'nope' })).toBe('{{secret}}')
  })

  it('leaves a declared name standing when no value was supplied', () => {
    // Better a visible placeholder in a test send than the word "undefined"
    // arriving in a participant's inbox.
    expect(render('Hi {{participantName}}', 'completion', {})).toBe('Hi {{participantName}}')
  })
})

describe('the catalogue', () => {
  it('covers the ten message types in PRD §15', () => {
    expect(MESSAGES).toHaveLength(10)
  })

  it('has a unique trigger for each', () => {
    expect(new Set(MESSAGES.map(m => m.trigger)).size).toBe(MESSAGES.length)
  })

  it('marks only access and registration as essential', () => {
    const essential = MESSAGES.filter(m => m.essential).map(m => m.trigger)
    expect(essential.sort()).toEqual(['account_setup', 'registration_confirm'])
  })

  it('treats an unknown trigger as unsendable rather than guessing', async () => {
    const result = await dispatch(input({ trigger: 'not_a_trigger' }))
    expect(result.status).toBe('skipped_unknown_trigger')
    expect(db.messageDelivery.create).not.toHaveBeenCalled()
  })

  it('agrees with isEssential', () => {
    expect(isEssential('account_setup')).toBe(true)
    expect(isEssential('completion')).toBe(false)
  })
})
