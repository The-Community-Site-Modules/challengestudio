/**
 * Getting in, and being kept out (PRD §22).
 */

import { test, expect } from '@playwright/test'
import { FIXTURE, PASSWORD } from './fixture'
import { pageText } from './helpers'

const f = FIXTURE

test.describe('signing in', () => {
  test('lands somewhere signed in', async ({ page }) => {
    const form = page.locator('form').first()
    await page.goto('/auth/login')
    await form.locator('input[name="email"]').fill(f.owner.email)
    await form.locator('input[name="password"]').fill(PASSWORD)
    await form.locator('button[type="submit"]').click()

    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'))
    await page.goto(`/ws/${f.workspace.slug}`)
    // The workspace name sits in the sidebar rather than the main region.
    expect(await page.locator('body').innerText()).toContain(f.workspace.name)
  })

  test('refuses a wrong password without saying which half was wrong', async ({ page }) => {
    const form = page.locator('form').first()
    await page.goto('/auth/login')
    await form.locator('input[name="email"]').fill(f.owner.email)
    await form.locator('input[name="password"]').fill('not-the-password')
    await form.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/auth\/login/)
    const text = (await pageText(page)).toLowerCase()
    // An error that distinguishes "no such account" from "wrong password"
    // confirms which addresses are registered.
    expect(text).not.toContain('no account')
    expect(text).not.toContain('user not found')
  })
})

test.describe('protected routes', () => {
  for (const path of ['/dashboard', '/account', '/account/profile', '/ws/e2e-studio']) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  }

  test('the intended destination is kept for after signing in', async ({ page }) => {
    await page.goto(`/ws/${f.workspace.slug}/challenges`)
    await expect(page).toHaveURL(/\/auth\/login/)
    expect(page.url()).toContain('next=')
  })
})

test.describe('the platform admin area', () => {
  test('is closed to an ordinary signed-in user', async ({ page }) => {
    const form = page.locator('form').first()
    await page.goto('/auth/login')
    await form.locator('input[name="email"]').fill(f.owner.email)
    await form.locator('input[name="password"]').fill(PASSWORD)
    await form.locator('button[type="submit"]').click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'))

    await page.goto('/admin')
    expect(page.url()).not.toMatch(/\/admin\b/)
  })
})
