/**
 * Security headers and the health endpoint (PRD §22, milestone 11).
 *
 * Headers are configuration, and configuration is exactly the kind of thing
 * that gets half-removed during a refactor and noticed months later. These
 * assertions are cheap and they fail loudly.
 */

import { test, expect } from '@playwright/test'
import { FIXTURE } from './fixture'

const f = FIXTURE

test.describe('security headers', () => {
  test('every response carries the static set', async ({ page }) => {
    const response = await page.goto(`/c/${f.challenge.slug}`)
    const headers = response!.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=()')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  })

  test('the policy keeps the directives that do the work', async ({ page }) => {
    const response = await page.goto('/auth/login')
    const policy = response!.headers()['content-security-policy']

    expect(policy, 'no CSP header at all').toBeTruthy()
    expect(policy).toContain("default-src 'self'")
    // No plugins, no <base> rewriting, no posting this site's forms elsewhere,
    // no framing. These are the ones worth having, and none is relaxed.
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
  })

  test('script sources are limited to this origin', async ({ page }) => {
    const response = await page.goto('/auth/login')
    const scriptSrc = response!.headers()['content-security-policy']
      ?.split(';').map(d => d.trim()).find(d => d.startsWith('script-src'))

    expect(scriptSrc).toBeTruthy()
    // Inline is allowed — see the comment in middleware.ts for why a nonce is
    // not usable on prerendered pages. No third-party origin is.
    expect(scriptSrc).not.toMatch(/https?:\/\//)
  })

  test('eval is not allowed in a production build', async ({ page }) => {
    // Turbopack needs it in development; nothing needs it in production.
    test.skip(!process.env.E2E_BASE_URL, 'only meaningful against a production server')

    const response = await page.goto('/auth/login')
    expect(response!.headers()['content-security-policy']).not.toContain("'unsafe-eval'")
  })

  test('a redirect carries the policy too', async ({ page }) => {
    // A page reached by redirect is still a page. Middleware returns early on
    // several paths, and each one has to set the header.
    const response = await page.goto('/dashboard')   // signed out → /auth/login
    expect(response!.headers()['content-security-policy']).toBeTruthy()
  })

  test('the page actually runs — the policy is not blocking its own scripts', async ({ page }) => {
    // The check that matters: a CSP tight enough to be worth having is tight
    // enough to break the app if the nonce is not reaching Next's own tags.
    const blocked: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) {
        blocked.push(message.text())
      }
    })

    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Hydration is the proof: a controlled input only updates if React ran.
    const email = page.locator('input[name="email"]').first()
    await email.fill('someone@example.com')
    await expect(email).toHaveValue('someone@example.com')

    expect(blocked, `CSP blocked something:\n${blocked.join('\n')}`).toEqual([])
  })
})

test.describe('health', () => {
  test('reports ok and says it reached the database', async ({ page }) => {
    const response = await page.request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.database).toBe('ok')
    expect(typeof body.latencyMs).toBe('number')
  })

  test('is never cached', async ({ page }) => {
    // A cached health check reports the past, which is worse than no check.
    const response = await page.request.get('/api/health')
    expect(response.headers()['cache-control']).toContain('no-store')
  })
})
