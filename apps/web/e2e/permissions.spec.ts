/**
 * What each role inside one workspace may see (PRD §27, §17.2, §17.3).
 *
 * The interesting cases are not "can the owner do everything". They are the
 * two places where a page must withhold rather than hide: a private
 * reflection, and a participant export. Both are checked here against the
 * rendered page and the raw response, because a value that is merely hidden
 * with CSS is still in the HTML.
 */

import { test, expect } from '@playwright/test'
import { FIXTURE } from './fixture'
import { as, pageText } from './helpers'

const f = FIXTURE
const base = `/ws/${f.workspace.slug}/challenges/${f.challenge.slug}`

test.describe('the owner', () => {
  test('sees the metrics counted from the records', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto(`${base}/analytics`)

    const text = await pageText(page)
    expect(text).toContain('Registrations')
    // Three registered, two of them started, one finished.
    expect(text).toMatch(/2 started \(67%\)/)
    expect(text).toContain('33%')
  })

  test('may read a private submission', async ({ browser }) => {
    const page = await as(browser, 'owner')
    await page.goto(`${base}/participants/e2e_pt_0`)

    const text = await pageText(page)
    expect(text).toContain('Private')
    expect(text).toContain(f.privateAnswer)
  })

  test('can export, and the export carries no submission text', async ({ browser }) => {
    const page = await as(browser, 'owner')
    const response = await page.request.get(`${base}/analytics/export`)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-disposition']).toContain('attachment')

    const csv = await response.text()
    expect(csv.split('\r\n')[0]).toContain('name,email,status')
    expect(csv).toContain(f.participants[0]!.email)
    // §17.3: counts and dates, never bodies.
    expect(csv).not.toContain(f.privateAnswer)
    expect(csv).not.toContain(f.publicAnswer)
  })
})

test.describe('an admin', () => {
  test('sees the analytics', async ({ browser }) => {
    const page = await as(browser, 'admin')
    await page.goto(`${base}/analytics`)
    expect(await pageText(page)).toContain('Registrations')
  })

  test('is told a private submission exists but cannot read it', async ({ browser }) => {
    const page = await as(browser, 'admin')
    await page.goto(`${base}/participants/e2e_pt_0`)

    const text = await pageText(page)
    expect(text).toContain(f.publicAnswer)
    expect(text).toContain('Private')
    expect(text).not.toContain(f.privateAnswer)
  })

  test('does not get the private text in the HTML either', async ({ browser }) => {
    // Withheld on the server, not hidden in the page — the difference matters.
    const page = await as(browser, 'admin')
    await page.goto(`${base}/participants/e2e_pt_0`)
    expect(await page.content()).not.toContain(f.privateAnswer)
  })

  test('is refused the export at the route, not only in the UI', async ({ browser }) => {
    const page = await as(browser, 'admin')
    await page.goto(`${base}/analytics`)
    expect(await pageText(page)).not.toContain('Export CSV')

    const response = await page.request.get(`${base}/analytics/export`)
    expect(response.status()).toBe(403)
  })
})

test.describe('a plain member', () => {
  test('sees the challenge but none of the numbers', async ({ browser }) => {
    const page = await as(browser, 'member')
    await page.goto(`${base}/overview`)

    const text = await pageText(page)
    expect(text).toContain(f.challenge.title)
    expect(text).toContain('does not include viewing analytics')
    expect(text).not.toContain('Day-by-day')
  })

  test('cannot open the participant list', async ({ browser }) => {
    const page = await as(browser, 'member')
    await page.goto(`${base}/participants`)
    expect(await pageText(page)).not.toContain(f.participants[0]!.email)
  })
})
