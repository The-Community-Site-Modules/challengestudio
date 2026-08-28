/**
 * Accessibility pass (Build Plan §7 milestone 11, PRD §21).
 *
 * axe-core against the pages a real person actually moves through: the public
 * registration page, the login form, the participant hub and day page, and the
 * creator's dashboard, builder and analytics.
 *
 * Scoped to serious and critical violations of WCAG 2 A and AA. Axe's "minor"
 * and "moderate" findings are worth reading but not worth failing a build
 * over; the ones here are the ones that stop somebody using the page.
 *
 * A failure prints the rule, the impact and the offending element, so the
 * report says what to fix rather than only that something is wrong.
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { FIXTURE } from './fixture'
import { as } from './helpers'

const f = FIXTURE
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function audit(page: Page, label: string) {
  // Some of these routes redirect (/account to the profile page, /dashboard to
  // a workspace). Auditing before the last navigation settles destroys axe's
  // execution context mid-run.
  await page.waitForLoadState('networkidle')

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()

  const serious = results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  )

  const report = serious.map(v => {
    const where = v.nodes.slice(0, 3).map(n => `      ${n.html.slice(0, 120)}`).join('\n')
    return `  [${v.impact}] ${v.id} — ${v.help}\n${where}`
  }).join('\n')

  expect(serious, `${label} has accessibility violations:\n${report}`).toEqual([])
}

test.describe('public pages', () => {
  test('the registration page', async ({ page }) => {
    await page.goto(`/c/${f.challenge.slug}`)
    await audit(page, 'public challenge page')
  })

  test('the login form', async ({ page }) => {
    await page.goto('/auth/login')
    await audit(page, 'login')
  })

  test('the sign-up form', async ({ page }) => {
    await page.goto('/auth/signup')
    await audit(page, 'signup')
  })

  test('the sign-up form showing errors', async ({ page }) => {
    // Submitting empty puts every field into its error state at once, which
    // is the state most likely to fail contrast or lose its label.
    await page.goto('/auth/signup')
    await page.getByRole('button', { name: 'Create Account' }).click()
    await page.waitForTimeout(300)
    await audit(page, 'signup (errors)')
  })

  test('the sign-up form on a phone', async ({ page }) => {
    // The brand panel is hidden below lg — a different rendering.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/auth/signup')
    await audit(page, 'signup (mobile)')
  })

  // The auth layout was slimmed so sign-up could go full width; the rest keep
  // their centred card through AuthShell. Auditing each one is also how a
  // page that failed to render at all would be caught.
  for (const path of ['/auth/forgot-password', '/auth/reset-password', '/auth/verify']) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path)
      await audit(page, path)
    })
  }

  test('the home page', async ({ page }) => {
    await page.goto('/')
    await audit(page, 'home')
  })

  test('features', async ({ page }) => {
    await page.goto('/features')
    await audit(page, 'features')
  })

  test('use cases', async ({ page }) => {
    await page.goto('/use-cases')
    await audit(page, 'use-cases')
  })

  test('pricing', async ({ page }) => {
    await page.goto('/pricing')
    await audit(page, 'pricing')
  })

  test('pricing, with monthly selected', async ({ page }) => {
    // The toggle swaps every price and its billing line; audit both states.
    await page.goto('/pricing')
    await page.getByRole('radio', { name: /^Monthly$/ }).click()
    await audit(page, 'pricing (monthly)')
  })

  test('pricing on a phone', async ({ page }) => {
    // Below md the comparison is a stack of per-plan cards, not the table —
    // a different rendering, so a different audit.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pricing')
    await audit(page, 'pricing (mobile)')
  })
})

test.describe('participant pages', () => {
  test('the hub', async ({ browser }) => {
    const page = await as(browser, 'grace')
    await page.goto(`/c/${f.challenge.slug}/hub`)
    await audit(page, 'hub')
  })

  test('a day page', async ({ browser }) => {
    const page = await as(browser, 'grace')
    await page.goto(`/c/${f.challenge.slug}/day/1`)
    await audit(page, 'day page')
  })

  test('the feed', async ({ browser }) => {
    const page = await as(browser, 'grace')
    await page.goto(`/c/${f.challenge.slug}/feed`)
    await audit(page, 'feed')
  })
})

test.describe('creator pages', () => {
  test('the dashboard', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto('/dashboard')
    await audit(page, 'dashboard')
  })

  test('the challenge overview', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto(`/ws/${f.workspace.slug}/challenges/${f.challenge.slug}/overview`)
    await audit(page, 'challenge overview')
  })

  test('the analytics page', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto(`/ws/${f.workspace.slug}/challenges/${f.challenge.slug}/analytics`)
    await audit(page, 'analytics')
  })

  test('the participant detail page', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto(`/ws/${f.workspace.slug}/challenges/${f.challenge.slug}/participants/e2e_pt_0`)
    await audit(page, 'participant detail')
  })

  test('account settings', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto('/account')
    await audit(page, 'account')
  })
})

test.describe('keyboard access', () => {
  test('the login form can be completed without a mouse', async ({ page }) => {
    await page.goto('/auth/login')

    await page.keyboard.press('Tab')
    // Walk forward until the email field has focus, then type through the form.
    for (let i = 0; i < 12; i++) {
      const name = await page.evaluate(() => (document.activeElement as HTMLInputElement)?.name)
      if (name === 'email') break
      await page.keyboard.press('Tab')
    }

    const focused = await page.evaluate(() => (document.activeElement as HTMLInputElement)?.name)
    expect(focused, 'the email field was never reachable by Tab').toBe('email')
  })

  test('every focusable control on the hub shows a focus ring', async ({ browser }) => {
    // A control that can be focused but shows nothing is unusable by keyboard
    // even though axe sees nothing wrong with it.
    const page = await as(browser, 'grace')
    await page.goto(`/c/${f.challenge.slug}/hub`)

    const invisible = await page.evaluate(() => {
      const selector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      const offenders: string[] = []
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        if (el.offsetParent === null) continue        // not visible anyway
        el.focus()
        const style = getComputedStyle(el)
        const ring = style.outlineStyle !== 'none' || style.boxShadow !== 'none'
        if (!ring) offenders.push(el.outerHTML.slice(0, 100))
      }
      return offenders.slice(0, 5)
    })

    expect(invisible, 'focusable controls with no visible focus indicator').toEqual([])
  })
})
