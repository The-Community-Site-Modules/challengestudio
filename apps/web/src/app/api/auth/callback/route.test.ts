/**
 * The link in every auth email lands here. A link opened in another browser
 * cannot be exchanged (the PKCE verifier cookie is not there), and a
 * participant should be told so — on the challenge's own sign-in page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const exchange = vi.fn()
const verifyOtp = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: exchange, verifyOtp } }),
}))
const enrollAfterAuth = vi.fn()
vi.mock('@/lib/enrollment/register', () => ({
  enrollAfterAuth: (...a: unknown[]) => enrollAfterAuth(...a),
  EnrollmentRefusedError: class extends Error {},
}))

const { GET } = await import('./route')
const call = (qs: string) => GET(new Request(`https://www.site.test/api/auth/callback?${qs}`) as never)

beforeEach(() => { vi.clearAllMocks() })

describe('auth callback', () => {
  it('signs in, enrols and goes to the welcome page', async () => {
    exchange.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c', user_metadata: { password_set: true } } }, error: null })
    const res = await call('code=abc&challenge=ch1&name=Ada&next=%2Fc%2Fsprint%2Fwelcome')
    expect(enrollAfterAuth).toHaveBeenCalledWith('u1', 'a@b.c', 'Ada', 'ch1')
    expect(res.headers.get('location')).toBe('https://www.site.test/c/sprint/welcome')
  })

  it('sends a registration link opened in another browser back to the registration form, saying why', async () => {
    // The challenge sign-in page only signs in — a link asked for there never
    // enrolled anyone. The form's link does.
    exchange.mockResolvedValue({
      data: {}, error: { code: 'bad_code_verifier', message: 'invalid request: both auth code and code verifier should be non-empty' },
    })
    const res = await call('code=abc&challenge=ch1&next=%2Fc%2Fsprint%2Fwelcome')
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/c/sprint')
    expect(location.searchParams.get('error')).toMatch(/same browser you registered in.*Register again/)
    expect(enrollAfterAuth).not.toHaveBeenCalled()
  })

  it('sends a challenge sign-in link opened in another browser to the challenge sign-in page', async () => {
    exchange.mockResolvedValue({
      data: {}, error: { code: 'bad_code_verifier', message: 'invalid request: both auth code and code verifier should be non-empty' },
    })
    const res = await call('code=abc&next=%2Fc%2Fsprint%2Fhub')
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/c/sprint/access')
    expect(location.searchParams.get('error')).toMatch(/same browser/)
  })

  it('sends other failures to the product sign-in page', async () => {
    exchange.mockResolvedValue({ data: {}, error: { code: 'otp_expired', message: 'Email link has expired' } })
    const res = await call('code=abc')
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/auth/login')
    expect(location.searchParams.get('error')).toBe('Email link has expired')
  })

  it('never redirects off-site, whatever next says', async () => {
    exchange.mockResolvedValue({ data: { user: null }, error: null })
    const res = await call('code=abc&next=%40evil.example')
    expect(new URL(res.headers.get('location')!).host).toBe('www.site.test')
  })
})

// ─── Offering a password after a link sign-in ────────────────────────────────
//
// Everyone who registers arrives by email link, and Supabase gives such an
// account a random password nobody knows — so the database cannot tell who
// has one. The app records it as `password_set` in user metadata when a person
// chooses one, and offers the page to everyone else.

describe('after a link sign-in', () => {
  const as = (metadata: Record<string, unknown>) =>
    ({ data: { user: { id: 'u1', email: 'a@b.c', user_metadata: metadata } }, error: null })

  it('offers a password to someone who has never chosen one, keeping the destination', async () => {
    exchange.mockResolvedValue(as({ full_name: 'Ada' }))
    const res = await call('code=abc&next=%2Fdashboard')
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/auth/set-password')
    expect(location.searchParams.get('next')).toBe('/dashboard')
  })

  it('still enrols a new participant first, then offers it', async () => {
    exchange.mockResolvedValue(as({}))
    const res = await call('code=abc&challenge=ch1&name=Ada&next=%2Fc%2Fsprint%2Fwelcome')
    expect(enrollAfterAuth).toHaveBeenCalledWith('u1', 'a@b.c', 'Ada', 'ch1')
    expect(new URL(res.headers.get('location')!).searchParams.get('next')).toBe('/c/sprint/welcome')
  })

  it('goes straight on for someone who has chosen one', async () => {
    exchange.mockResolvedValue(as({ password_set: true }))
    const res = await call('code=abc&next=%2Fdashboard')
    expect(res.headers.get('location')).toBe('https://www.site.test/dashboard')
  })

  it('does not take a truthy string for the flag', async () => {
    exchange.mockResolvedValue(as({ password_set: 'yes' }))
    const res = await call('code=abc&next=%2Fdashboard')
    expect(new URL(res.headers.get('location')!).pathname).toBe('/auth/set-password')
  })

  it('leaves a password-reset link alone — that is already where passwords are set', async () => {
    exchange.mockResolvedValue(as({}))
    const res = await call('code=abc&next=%2Fauth%2Freset-password')
    expect(res.headers.get('location')).toBe('https://www.site.test/auth/reset-password')
  })
})

// ─── Links that work in any browser ──────────────────────────────────────────
//
// The Supabase templates link here with a token hash and our own URL as
// redirect_to. Depending on the template engine, our parameters arrive
// percent-encoded inside redirect_to, or pasted in raw beside it.

describe('a token link from the email template', () => {
  const ours = 'https://www.site.test/api/auth/callback?next=%2Fc%2Fsprint%2Fwelcome&challenge=ch1&name=Ada%20Lovelace'
  const signedIn = { data: { user: { id: 'u1', email: 'a@b.c', user_metadata: { password_set: true } } }, error: null }

  it('verifies the token — no cookie needed — then enrols, with redirect_to encoded', async () => {
    verifyOtp.mockResolvedValue(signedIn)
    const res = await call(`token_hash=th1&type=email&redirect_to=${encodeURIComponent(ours)}`)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'th1', type: 'email' })
    expect(exchange).not.toHaveBeenCalled()
    expect(enrollAfterAuth).toHaveBeenCalledWith('u1', 'a@b.c', 'Ada Lovelace', 'ch1')
    expect(res.headers.get('location')).toBe('https://www.site.test/c/sprint/welcome')
  })

  it('reads the same parameters when redirect_to was pasted in raw', async () => {
    verifyOtp.mockResolvedValue(signedIn)
    const res = await call(`token_hash=th1&type=email&redirect_to=${ours}`)
    expect(enrollAfterAuth).toHaveBeenCalledWith('u1', 'a@b.c', 'Ada Lovelace', 'ch1')
    expect(res.headers.get('location')).toBe('https://www.site.test/c/sprint/welcome')
  })

  it('offers a password to a new participant, keeping the welcome page as the destination', async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c', user_metadata: {} } }, error: null })
    const res = await call(`token_hash=th1&type=email&redirect_to=${encodeURIComponent(ours)}`)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/auth/set-password')
    expect(location.searchParams.get('next')).toBe('/c/sprint/welcome')
  })

  it('sends a spent registration link back to the form to get a new one', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { code: 'otp_expired', message: 'Email link is invalid or has expired' } })
    const res = await call(`token_hash=th1&type=email&redirect_to=${encodeURIComponent(ours)}`)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/c/sprint')
    expect(location.searchParams.get('error')).toMatch(/expired or has already been used.*Register again/)
    expect(enrollAfterAuth).not.toHaveBeenCalled()
  })

  it('takes a password-reset link to the reset page, not the create-password offer', async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c', user_metadata: {} } }, error: null })
    const back = 'https://www.site.test/api/auth/callback?next=%2Fauth%2Freset-password'
    const res = await call(`token_hash=th2&type=recovery&redirect_to=${encodeURIComponent(back)}`)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'th2', type: 'recovery' })
    expect(res.headers.get('location')).toBe('https://www.site.test/auth/reset-password')
  })

  it('signs in and goes to the dashboard when Supabase fell back to the bare Site URL', async () => {
    verifyOtp.mockResolvedValue(signedIn)
    const res = await call('token_hash=th1&type=email&redirect_to=http://www.site.test')
    expect(enrollAfterAuth).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('https://www.site.test/dashboard')
  })

  it('ignores an unknown type rather than guessing', async () => {
    const res = await call('token_hash=th1&type=bogus')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(new URL(res.headers.get('location')!).pathname).toBe('/auth/login')
  })

  it('never redirects off-site from inside redirect_to either', async () => {
    verifyOtp.mockResolvedValue(signedIn)
    const evil = 'https://www.site.test/api/auth/callback?next=%40evil.example'
    const res = await call(`token_hash=th1&type=email&redirect_to=${encodeURIComponent(evil)}`)
    expect(new URL(res.headers.get('location')!).host).toBe('www.site.test')
  })
})
