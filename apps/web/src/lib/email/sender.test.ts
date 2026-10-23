/**
 * The From and Reply-To headers a workspace's branding produces.
 *
 * This is the last point before creator-typed text becomes an email header, so
 * it is tested against the provider call itself rather than trusted from the
 * functions upstream: a newline in a sender name, or a display name smuggled
 * into a reply address, must not reach Resend.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const send = vi.fn(async () => ({ data: { id: 'msg_1' }, error: null }))
vi.mock('resend', () => ({
  Resend: class { emails = { send } },
}))

const { sendEmail } = await import('./index')

const env = { ...process.env }
beforeEach(() => {
  send.mockClear()
  process.env.RESEND_API_KEY = 're_test'
  process.env.EMAIL_FROM_ADDRESS = 'hello@mychallengestudio.com'
  process.env.EMAIL_FROM_NAME = 'Challenge Studio'
})
afterEach(() => { process.env = { ...env } })

const base = {
  to: 'ada@example.com', subject: 'Day 1', html: '<p>Hi</p>', text: 'Hi',
  trigger: 'workspace_invitation' as const,
}

const sentWith = () => (send.mock.calls.at(-1) as unknown as [Record<string, unknown>])[0]

describe('From', () => {
  it('uses the workspace sender name with our address', async () => {
    await sendEmail({ ...base, fromName: 'Coaching Studio' })
    expect(sentWith().from).toBe('Coaching Studio <hello@mychallengestudio.com>')
  })

  it('keeps our name when the workspace has not set one', async () => {
    await sendEmail(base)
    expect(sentWith().from).toBe('Challenge Studio <hello@mychallengestudio.com>')
  })

  it('cannot be used to add a header', async () => {
    await sendEmail({ ...base, fromName: 'Evil\r\nBcc: everyone@example.com' })
    const from = sentWith().from as string
    expect(from).not.toMatch(/[\r\n]/)
    expect(from.endsWith('<hello@mychallengestudio.com>')).toBe(true)
  })

  it('cannot change the address', async () => {
    await sendEmail({ ...base, fromName: 'Bank <security@bank.example>' })
    const from = sentWith().from as string
    // One address only, and it is ours.
    expect(from.match(/</g)).toHaveLength(1)
    expect(from.endsWith('<hello@mychallengestudio.com>')).toBe(true)
  })
})

describe('Reply-To', () => {
  it('goes to the workspace support inbox', async () => {
    await sendEmail({ ...base, replyTo: 'help@coach.example' })
    expect(sentWith().replyTo).toBe('help@coach.example')
  })

  it('is left off entirely when there is none', async () => {
    await sendEmail(base)
    expect(sentWith()).not.toHaveProperty('replyTo')
  })

  it('refuses anything that is not a plain address', async () => {
    await sendEmail({ ...base, replyTo: 'Help <help@coach.example>, other@x.example' })
    expect(sentWith()).not.toHaveProperty('replyTo')
  })
})

describe('the platform address', () => {
  it('reads RESEND_FROM_EMAIL when EMAIL_FROM_ADDRESS is not set', async () => {
    // Production was configured with these names; without them every email
    // left from Resend's testing address and was refused.
    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.EMAIL_FROM_NAME
    process.env.RESEND_FROM_EMAIL = 'noreply@mychallengestudio.com'
    process.env.RESEND_FROM_NAME = 'My Challenge Studio'
    await sendEmail(base)
    expect(sentWith().from).toBe('My Challenge Studio <noreply@mychallengestudio.com>')
  })

  it('accepts an address written as "Name <address>"', async () => {
    delete process.env.EMAIL_FROM_ADDRESS
    process.env.RESEND_FROM_EMAIL = 'Studio <noreply@mychallengestudio.com>'
    await sendEmail(base)
    expect(sentWith().from).toBe('Challenge Studio <noreply@mychallengestudio.com>')
  })

  it('prefers EMAIL_FROM_ADDRESS when both are set', async () => {
    process.env.RESEND_FROM_EMAIL = 'other@mychallengestudio.com'
    await sendEmail(base)
    expect(sentWith().from).toBe('Challenge Studio <hello@mychallengestudio.com>')
  })

  it('falls back to the testing address only when neither is set', async () => {
    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.RESEND_FROM_EMAIL
    await sendEmail(base)
    expect(sentWith().from).toBe('Challenge Studio <onboarding@resend.dev>')
  })
})
