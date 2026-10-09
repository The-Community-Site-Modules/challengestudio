/**
 * Emailed sign-in links must come back to the domain the form was submitted
 * on — only that domain holds the PKCE verifier cookie.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let requestHeaders = new Headers()
vi.mock('next/headers', () => ({ headers: async () => requestHeaders }))

const { requestOrigin } = await import('./origin')

beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://challengestudio.vercel.app') })
afterEach(() => { vi.unstubAllEnvs() })

describe('requestOrigin', () => {
  it('uses the origin the form was submitted from, not the configured URL', () => {
    requestHeaders = new Headers({ origin: 'https://www.mychallengestudio.com' })
    return expect(requestOrigin()).resolves.toBe('https://www.mychallengestudio.com')
  })

  it('falls back to the forwarded host when there is no Origin header', () => {
    requestHeaders = new Headers({ 'x-forwarded-host': 'www.mychallengestudio.com', 'x-forwarded-proto': 'https' })
    return expect(requestOrigin()).resolves.toBe('https://www.mychallengestudio.com')
  })

  it('falls back to NEXT_PUBLIC_APP_URL when the request names no host', () => {
    requestHeaders = new Headers()
    return expect(requestOrigin()).resolves.toBe('https://challengestudio.vercel.app')
  })

  it.each([
    'https://evil.example/path',
    'javascript:alert(1)',
    'https://a b.example',
  ])('ignores a malformed origin %j', (origin) => {
    requestHeaders = new Headers({ origin })
    return expect(requestOrigin()).resolves.toBe('https://challengestudio.vercel.app')
  })

  it('refuses a malformed host header too', () => {
    requestHeaders = new Headers({ host: 'evil.example/@x' })
    return expect(requestOrigin()).resolves.toBe('https://challengestudio.vercel.app')
  })
})
