/**
 * Opening an uploaded submission file. The bucket is private; this route is
 * the only way in, so every check it makes is the only one there is.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace:  { findUnique: vi.fn() },
  challenge:  { findUnique: vi.fn() },
  submission: { findUnique: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/auth/session', () => ({ requireUser: async () => ({ id: 'u1', email: 'a@b.c' }) }))

const allowed = new Set<string>()
vi.mock('@/lib/permissions', () => ({
  hasPermission: async (_u: string, _w: string, cap: string) => allowed.has(cap),
}))

const signedDownloadUrl = vi.fn(async (key: string) => `https://storage.example/signed/${key}`)
vi.mock('@/lib/storage', () => ({ signedDownloadUrl, storageConfigured: () => true }))

const { GET } = await import('./route')

const OWN_KEY = 'ws1/ch1/p1/abc.pdf'
const call = (n = '0', submissionId = 's1') =>
  GET(new Request(`https://app.example/ws/acme/challenges/sprint/submissions/${submissionId}/file?n=${n}`), {
    params: Promise.resolve({ workspaceSlug: 'acme', challengeSlug: 'sprint', submissionId }),
  })

const withSubmission = (over: Record<string, unknown> = {}) =>
  db.submission.findUnique.mockResolvedValue({
    data: { blk: { key: OWN_KEY, filename: 'plan.pdf' } },
    isPrivate: false, participantId: 'p1', step: { challengeId: 'ch1' }, ...over,
  })

beforeEach(() => {
  vi.clearAllMocks()
  allowed.clear()
  allowed.add('submission.view_all')
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1' })
  db.challenge.findUnique.mockResolvedValue({ id: 'ch1' })
  withSubmission()
})

describe('submission file route', () => {
  it('redirects to a short-lived signed link for the participant’s own upload', async () => {
    const res = await call()
    expect(res.status).toBe(307)
    expect(signedDownloadUrl).toHaveBeenCalledWith(OWN_KEY)
  })

  it('refuses without permission to view submissions', async () => {
    allowed.clear()
    expect((await call()).status).toBe(403)
    expect(signedDownloadUrl).not.toHaveBeenCalled()
  })

  it('refuses a submission from another challenge', async () => {
    withSubmission({ step: { challengeId: 'elsewhere' } })
    expect((await call()).status).toBe(404)
  })

  it('needs the private capability for private work', async () => {
    withSubmission({ data: { blk: { key: OWN_KEY }, r: { text: 'x', isPrivate: true } } })
    expect((await call()).status).toBe(403)
    allowed.add('submission.view_private')
    expect((await call()).status).toBe(307)
  })

  it('will not sign a key outside the participant’s own folder', async () => {
    // The payload is written by the participant, who could paste in the key
    // of someone else's upload.
    withSubmission({ data: { blk: { key: 'ws1/ch1/someone-else/secret.pdf' } } })
    expect((await call()).status).toBe(404)
    expect(signedDownloadUrl).not.toHaveBeenCalled()
  })

  it.each(['1', '-1', 'abc', '0.5'])('404s for a file index of %s', async (n) => {
    expect((await call(n)).status).toBe(404)
  })
})
