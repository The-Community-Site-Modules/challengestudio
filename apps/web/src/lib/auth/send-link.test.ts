/**
 * The app emails sign-in links itself so they open on any device, and falls
 * back to Supabase's own (same-browser) email when it cannot.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateLink = vi.fn()
const signInWithOtp = vi.fn(async () => ({ error: null as { message: string } | null }))
const resetPasswordForEmail = vi.fn(async () => ({ error: null as { message: string } | null }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink } } }),
  createClient: async () => ({ auth: { signInWithOtp, resetPasswordForEmail } }),
}))
const deliveries = vi.fn(async (_a: { data: Record<string, unknown> }) => ({}))
vi.mock('@/lib/db', () => ({ db: { challenge: { findFirst: vi.fn(async () => null) }, messageDelivery: { create: (a: never) => deliveries(a) } } }))
const sendEmail = vi.fn()
vi.mock('@/lib/email', async (original) => ({
  ...(await original<typeof import('@/lib/email')>()),
  sendEmail: (m: unknown) => sendEmail(m),
}))

const { sendAuthLink, tokenLink } = await import('./send-link')
const { __resetRateLimits } = await import('@/lib/rate-limit')

const CALLBACK = 'https://www.site.test/api/auth/callback?next=%2Fc%2Fsprint%2Fwelcome&challenge=ch1&name=Ada'
const generated = (hash = 'th1', type = 'magiclink') =>
  ({ data: { properties: { hashed_token: hash, verification_type: type } }, error: null })

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimits()
  generateLink.mockResolvedValue(generated())
  sendEmail.mockResolvedValue({ sent: true, provider: 'resend' })
})

describe('sendAuthLink', () => {
  it('emails a token link to our callback, keeping its parameters', async () => {
    const res = await sendAuthLink({ kind: 'register', email: 'Ada@Example.com', callbackUrl: CALLBACK, fullName: 'Ada', challengeTitle: 'Sprint' })
    expect(res).toEqual({ ok: true, via: 'app' })
    expect(generateLink).toHaveBeenCalledWith({
      type: 'magiclink', email: 'ada@example.com', options: { redirectTo: CALLBACK, data: { full_name: 'Ada' } },
    })
    const message = sendEmail.mock.calls[0]![0] as { to: string; subject: string; html: string; text: string }
    expect(message.to).toBe('ada@example.com')
    expect(message.subject).toBe('Confirm your place in Sprint')
    expect(message.text).toContain(`${CALLBACK}&token_hash=th1&type=magiclink`)
    expect(message.html).toContain('token_hash=th1&amp;type=magiclink')
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('uses a recovery token for a reset', async () => {
    generateLink.mockResolvedValue(generated('th2', 'recovery'))
    await sendAuthLink({ kind: 'reset', email: 'a@b.c', callbackUrl: 'https://www.site.test/api/auth/callback?next=%2Fauth%2Freset-password' })
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'recovery' }))
    expect((sendEmail.mock.calls[0]![0] as { text: string }).text).toContain('type=recovery')
  })

  it('falls back to Supabase when the app email does not go out', async () => {
    sendEmail.mockResolvedValue({ sent: false, provider: 'resend', reason: 'domain not verified' })
    const res = await sendAuthLink({ kind: 'register', email: 'a@b.c', callbackUrl: CALLBACK, fullName: 'Ada' })
    expect(res).toEqual({ ok: true, via: 'supabase' })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.c', options: { shouldCreateUser: true, emailRedirectTo: CALLBACK, data: { full_name: 'Ada' } },
    })
  })

  it('falls back to Supabase when the link cannot be generated', async () => {
    generateLink.mockResolvedValue({ data: null, error: { status: 500, message: 'boom' } })
    const res = await sendAuthLink({ kind: 'reset', email: 'a@b.c', callbackUrl: CALLBACK })
    expect(res).toEqual({ ok: true, via: 'supabase' })
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.c', { redirectTo: CALLBACK })
  })

  it('reports a failure only when the fallback fails too', async () => {
    sendEmail.mockResolvedValue({ sent: false, provider: 'console', reason: 'no key' })
    signInWithOtp.mockResolvedValueOnce({ error: { message: 'email rate limit exceeded' } })
    const res = await sendAuthLink({ kind: 'sign_in', email: 'a@b.c', callbackUrl: CALLBACK })
    expect(res).toEqual({ ok: false, error: 'email rate limit exceeded' })
  })

  it('says nothing about a reset for an address with no account', async () => {
    generateLink.mockResolvedValue({ data: null, error: { status: 404, message: 'User with this email not found' } })
    const res = await sendAuthLink({ kind: 'reset', email: 'nobody@b.c', callbackUrl: CALLBACK })
    expect(res).toEqual({ ok: true, via: 'none' })
    expect(sendEmail).not.toHaveBeenCalled()
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('limits how many links one address can be sent', async () => {
    for (let i = 0; i < 5; i++) await sendAuthLink({ kind: 'sign_in', email: 'a@b.c', callbackUrl: CALLBACK })
    const res = await sendAuthLink({ kind: 'sign_in', email: 'A@B.C', callbackUrl: CALLBACK })
    expect(res.ok).toBe(false)
    expect(sendEmail).toHaveBeenCalledTimes(5)
  })
})

describe('the delivery log', () => {
  it('records a failed send with its reason when the link belongs to a workspace', async () => {
    sendEmail.mockResolvedValue({ sent: false, provider: 'resend', reason: 'domain not verified' })
    await sendAuthLink({ kind: 'register', email: 'a@b.c', callbackUrl: CALLBACK, workspaceId: 'w1', challengeId: 'ch1' })
    expect(deliveries).toHaveBeenCalledWith({ data: expect.objectContaining({
      workspaceId: 'w1', challengeId: 'ch1', recipientEmail: 'a@b.c', status: 'failed', provider: 'resend', error: 'domain not verified',
    }) })
  })

  it('records nothing for a link with no workspace', async () => {
    await sendAuthLink({ kind: 'reset', email: 'a@b.c', callbackUrl: CALLBACK })
    expect(deliveries).not.toHaveBeenCalled()
  })

  it('still sends when the log cannot be written', async () => {
    deliveries.mockRejectedValueOnce(new Error('db down'))
    const res = await sendAuthLink({ kind: 'register', email: 'a@b.c', callbackUrl: CALLBACK, workspaceId: 'w1' })
    expect(res).toEqual({ ok: true, via: 'app' })
  })
})

describe('tokenLink', () => {
  it('appends to a callback with or without a query', () => {
    expect(tokenLink('https://x.test/api/auth/callback', 'h', 'email')).toBe('https://x.test/api/auth/callback?token_hash=h&type=email')
    expect(tokenLink('https://x.test/api/auth/callback?next=%2Fa', 'h', 'email')).toBe('https://x.test/api/auth/callback?next=%2Fa&token_hash=h&type=email')
  })
})

describe('the email', () => {
  it('escapes a challenge title in the HTML', async () => {
    await sendAuthLink({ kind: 'register', email: 'a@b.c', callbackUrl: CALLBACK, challengeTitle: '<b>Sprint</b>' })
    const message = sendEmail.mock.calls[0]![0] as { html: string }
    expect(message.html).not.toContain('<b>Sprint</b>')
    expect(message.html).toContain('&lt;b&gt;Sprint&lt;/b&gt;')
  })

  it('uses the workspace sender name and reply-to', async () => {
    await sendAuthLink({ kind: 'register', email: 'a@b.c', callbackUrl: CALLBACK, senderName: 'Coach Amy', replyTo: 'help@amy.test' })
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ fromName: 'Coach Amy', replyTo: 'help@amy.test' }))
  })
})
