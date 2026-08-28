import type { Browser, Page } from '@playwright/test'
import { storagePath, type Role } from './fixture'

/**
 * A page already signed in as one of the fixture people.
 *
 * The session comes from cookies saved in global setup rather than from
 * signing in here — see global-setup.ts for why that matters.
 *
 * Still a context per person: Playwright shares cookies within a context, so
 * two roles in one context would tread on each other.
 */
export async function as(browser: Browser, role: Role): Promise<Page> {
  const context = await browser.newContext({ storageState: storagePath(role) })
  return context.newPage()
}

/** The visible text of the main region, or the body when a page has no main. */
export async function pageText(page: Page): Promise<string> {
  const main = page.locator('main')
  return (await main.count()) > 0 ? main.first().innerText() : page.locator('body').innerText()
}
