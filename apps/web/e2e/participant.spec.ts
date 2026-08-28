/**
 * The participant's own journey (PRD §11–§14).
 *
 * One spec that writes: Alan, who is enrolled and has done nothing, submits a
 * step and posts to the feed. Everything it creates belongs to the fixture
 * tenant and goes with it at teardown.
 */

import { test, expect } from '@playwright/test'
import { FIXTURE } from './fixture'
import { as, pageText } from './helpers'

const f = FIXTURE
const alan = f.participants[2]!

test.describe('the hub', () => {
  test('shows the steps and the upcoming session', async ({ browser }) => {
    const page = await as(browser, 'alan')
    await page.goto(`/c/${f.challenge.slug}/hub`)

    const text = await pageText(page)
    expect(text).toContain(f.steps[0]!.title)
    expect(text).toContain(f.session.title)
  })

  test('does not show another participant\'s private reflection', async ({ browser }) => {
    const page = await as(browser, 'alan')
    await page.goto(`/c/${f.challenge.slug}/feed`)
    expect(await page.content()).not.toContain(f.privateAnswer)
  })
})

test.describe('submitting', () => {
  test('records the answer and moves the progress on', async ({ browser }) => {
    const page = await as(browser, 'alan')
    await page.goto(`/c/${f.challenge.slug}/day/1`)

    const answer = page.locator('textarea').first()
    if (await answer.count() === 0) {
      test.skip(true, 'this step has no written answer to give')
    }

    await answer.fill('My answer, written by the end-to-end suite.')
    // The submit button enables once there is something to submit; clicking in
    // the same tick as the fill races that.
    const submit = page.getByRole('button', { name: /submit|complete|done/i }).first()
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page.getByText(/completed|submitted|nice work|well done/i).first())
      .toBeVisible({ timeout: 15_000 })
  })
})

test.describe('the feed', () => {
  test('accepts a post and shows it back', async ({ browser }) => {
    const page = await as(browser, 'alan')
    await page.goto(`/c/${f.challenge.slug}/feed`)

    const body = page.locator('textarea').first()
    await body.fill('Hello from the end-to-end suite.')
    await page.getByRole('button', { name: /post|share/i }).first().click()

    await expect(page.getByText('Hello from the end-to-end suite.').first())
      .toBeVisible({ timeout: 15_000 })
  })
})

test.describe('someone who is not enrolled', () => {
  test('is not shown the hub of a challenge they never joined', async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`/c/${f.challenge.slug}/hub`)

    // Either sent to the public page to register, or told they are not in it —
    // but never given the challenge content.
    const text = await pageText(page)
    expect(text).not.toContain(f.steps[1]!.title)
  })
})
