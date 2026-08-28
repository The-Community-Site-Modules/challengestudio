import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { seed, FIXTURE, PASSWORD, storagePath, type Role } from './fixture'

/**
 * Seed once, then sign in once per role and keep the session.
 *
 * Signing in inside each test seemed simpler until the suite ran: the auth
 * rate limit added in this same milestone is ten attempts per fifteen minutes
 * per address, and forty logins from one machine is exactly the pattern it
 * exists to stop. The limiter was right and the suite was wrong.
 *
 * Five logins, reused as stored cookies, is also several minutes faster.
 */
export default async function globalSetup(config: FullConfig) {
  await seed()

  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3100'
  mkdirSync(path.dirname(storagePath('owner')), { recursive: true })

  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_BUNDLED ? {} : { channel: 'chrome' }
  )

  try {
    const people: [Role, string][] = [
      ['owner',  FIXTURE.owner.email],
      ['admin',  FIXTURE.admin.email],
      ['member', FIXTURE.member.email],
      ['rival',  FIXTURE.rival.email],
      ['grace',  FIXTURE.participants[1]!.email],
      ['alan',   FIXTURE.participants[2]!.email],
    ]

    for (const [role, email] of people) {
      const context = await browser.newContext({ baseURL })
      const page = await context.newPage()
      const form = page.locator('form').first()

      await page.goto('/auth/login')
      await form.locator('input[name="email"]').fill(email)
      await form.locator('input[name="password"]').fill(PASSWORD)
      await form.locator('button[type="submit"]').click()
      await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 30_000 })

      await context.storageState({ path: storagePath(role) })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
