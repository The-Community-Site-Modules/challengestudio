/**
 * Cross-tenant isolation, through the browser (PRD §28).
 *
 * The unit tests in cross-tenant.test.ts prove the actions refuse a foreign
 * id. These prove the pages do too — that a rival signed into their own
 * account cannot reach another tenant's challenge, participants, analytics or
 * export by typing the URL.
 *
 * This is the spec worth keeping most: Prisma connects as the table owner, so
 * row-level security does not apply to anything the app does. Every one of
 * these boundaries is enforced by application code alone.
 */

import { test, expect } from '@playwright/test'
import { FIXTURE } from './fixture'
import { as, pageText } from './helpers'

const f = FIXTURE
const theirs = `/ws/${f.workspace.slug}/challenges/${f.challenge.slug}`

test.describe('a rival tenant', () => {
  test('cannot open another workspace', async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`/ws/${f.workspace.slug}`)

    expect(page.url()).not.toContain(`/ws/${f.workspace.slug}/`)
    expect(await pageText(page)).not.toContain(f.workspace.name)
  })

  test("cannot read another workspace's challenge overview", async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`${theirs}/overview`)
    expect(await pageText(page)).not.toContain(f.challenge.title)
  })

  test('cannot list another tenant\'s participants', async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`${theirs}/participants`)

    const text = await pageText(page)
    for (const p of f.participants) {
      expect(text, `leaked ${p.email}`).not.toContain(p.email)
    }
  })

  test("cannot open a participant's detail page by id", async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`${theirs}/participants/e2e_pt_0`)

    const text = await pageText(page)
    expect(text).not.toContain(f.publicAnswer)
    expect(text).not.toContain(f.privateAnswer)
  })

  test("cannot read another tenant's analytics", async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`${theirs}/analytics`)
    expect(await pageText(page)).not.toContain('Falling behind')
  })

  test("cannot download another tenant's participant export", async ({ browser }) => {
    const page = await as(browser, 'rival')
    const response = await page.request.get(`${theirs}/analytics/export`)

    // Either refused outright or redirected away — never a CSV of the rows.
    const body = await response.text()
    for (const p of f.participants) {
      expect(body, `leaked ${p.email}`).not.toContain(p.email)
    }
  })

  test("cannot moderate another tenant's feed", async ({ browser }) => {
    const page = await as(browser, 'rival')
    await page.goto(`${theirs}/community`)
    expect(await pageText(page)).not.toContain('Day one done.')
  })
})

test.describe('a signed-out visitor', () => {
  test('is sent to sign in rather than into the workspace', async ({ page }) => {
    await page.goto(`${theirs}/analytics`)
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('cannot reach the export at all', async ({ page }) => {
    const response = await page.request.get(`${theirs}/analytics/export`)
    const body = await response.text()
    expect(body).not.toContain(f.participants[0]!.email)
  })
})
