/**
 * setPasswordAction — the server half of /auth/set-password.
 *
 * The form checks the same rules, but a form is a courtesy: these go at the
 * action directly, the way anything bypassing the form would.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const auth = {
  getUser: vi.fn(async () => ({ data: { user: { id: 'u1', email: 'ada@example.com' } as unknown } })),
  updateUser: vi.fn(async (_: { password: string; data?: Record<string, unknown> }) => ({ error: null as null | { message: string } })),
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`REDIRECT:${to}`) } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { setPasswordAction } = await import('./actions')

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'ada@example.com' } } })
  auth.updateUser.mockResolvedValue({ error: null })
})

describe('setPasswordAction', () => {
  it('saves a password that meets the rules, and says where to go next', async () => {
    const result = await setPasswordAction(form({ password: 'finish2things', confirm: 'finish2things', next: '/c/sprint/hub' }))
    expect(result).toEqual({ ok: true, next: '/c/sprint/hub' })
    // And records it, so the next link sign-in does not offer this page again.
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'finish2things', data: { password_set: true } })
  })

  it('refuses one under the rules — too short, or no number — and saves nothing', async () => {
    for (const weak of ['short1', 'longbutnonumbers']) {
      const result = await setPasswordAction(form({ password: weak, confirm: weak }))
      expect(result).toMatchObject({ ok: false })
    }
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('refuses two passwords that do not match', async () => {
    const result = await setPasswordAction(form({ password: 'finish2things', confirm: 'finish2thing' }))
    expect(result).toEqual({ ok: false, error: 'The two passwords do not match.' })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('needs someone signed in — it can only ever set your own', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await setPasswordAction(form({ password: 'finish2things', confirm: 'finish2things' }))
    expect(result).toMatchObject({ ok: false })
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('never sends anyone off-site, whatever next says', async () => {
    const result = await setPasswordAction(form({ password: 'finish2things', confirm: 'finish2things', next: '//evil.example' }))
    expect(result).toEqual({ ok: true, next: '/dashboard' })
  })

  it("passes on Supabase's own refusal", async () => {
    auth.updateUser.mockResolvedValue({ error: { message: 'Password is known to be weak' } })
    const result = await setPasswordAction(form({ password: 'password123', confirm: 'password123' }))
    expect(result).toEqual({ ok: false, error: 'Password is known to be weak' })
  })
})
