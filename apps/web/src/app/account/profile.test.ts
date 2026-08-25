/**
 * updateProfileAction edits whoever is signed in — it takes no user id.
 *
 * Server action arguments are client-supplied, so an id parameter would be one
 * more thing that has to be checked on every call. Taking the identity from the
 * session removes the question entirely; these tests pin that down along with
 * the input validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const profile = { update: vi.fn() }
vi.mock('@/lib/db', () => ({ db: { profile } }))

class RedirectError extends Error {
  constructor(public destination: string) { super(`REDIRECT:${destination}`) }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const sessionUser = { id: 'me', email: 'me@example.com', fullName: 'Me', avatarUrl: null }
vi.mock('@/lib/auth/session', () => ({ requireUser: async () => sessionUser }))

const updateUser = vi.fn(async () => ({ error: null }))
const resetPasswordForEmail = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { updateUser, resetPasswordForEmail } }),
}))

const { updateProfileAction, requestPasswordChangeAction } = await import('./actions')

const form = (entries: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
    return ''
  } catch (e) {
    if (e instanceof RedirectError) return decodeURIComponent(e.destination)
    throw e
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  updateUser.mockResolvedValue({ error: null })
  resetPasswordForEmail.mockResolvedValue({ error: null })
})

describe('updateProfileAction', () => {
  it('writes to the signed-in user and nobody else', async () => {
    await redirectOf(() => updateProfileAction(form({ fullName: 'New Name', avatarUrl: '' })))

    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'me' }, data: { fullName: 'New Name', avatarUrl: null } })
    )
  })

  it('keeps the Supabase copy in step with the row', async () => {
    // The signup trigger seeds profiles from user_metadata. If the two drift, a
    // later backfill would quietly reinstate the stale name.
    await redirectOf(() => updateProfileAction(form({ fullName: 'New Name', avatarUrl: 'https://x.test/a.png' })))

    expect(updateUser).toHaveBeenCalledWith({
      data: { full_name: 'New Name', avatar_url: 'https://x.test/a.png' },
    })
  })

  it('rejects an empty or whitespace-only name', async () => {
    for (const value of ['', '   ', '\t']) {
      vi.clearAllMocks()
      const to = await redirectOf(() => updateProfileAction(form({ fullName: value })))
      expect(profile.update).not.toHaveBeenCalled()
      expect(to).toContain('cannot be empty')
    }
  })

  it('rejects a name over 100 characters', async () => {
    const to = await redirectOf(() => updateProfileAction(form({ fullName: 'a'.repeat(101) })))

    expect(profile.update).not.toHaveBeenCalled()
    expect(to).toContain('100 characters')
  })

  it('trims surrounding whitespace before saving', async () => {
    await redirectOf(() => updateProfileAction(form({ fullName: '  Padded Name  ' })))

    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fullName: 'Padded Name' }) })
    )
  })

  it('stores a blank avatar as null rather than an empty string', async () => {
    await redirectOf(() => updateProfileAction(form({ fullName: 'Name', avatarUrl: '  ' })))

    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ avatarUrl: null }) })
    )
  })

  it('rejects an avatar URL that is not https', async () => {
    // The value is rendered into an <img src>. javascript: and data: have no
    // business there, and plain http would break the page over TLS.
    for (const value of ['javascript:alert(1)', 'http://x.test/a.png', 'data:image/png;base64,AAA', 'not a url']) {
      vi.clearAllMocks()
      const to = await redirectOf(() => updateProfileAction(form({ fullName: 'Name', avatarUrl: value })))
      expect(profile.update).not.toHaveBeenCalled()
      expect(to).toContain('https://')
    }
  })

  it('accepts an https avatar URL', async () => {
    await redirectOf(() => updateProfileAction(form({ fullName: 'Name', avatarUrl: 'https://cdn.test/a.png' })))

    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ avatarUrl: 'https://cdn.test/a.png' }) })
    )
  })
})

describe('requestPasswordChangeAction', () => {
  it('sends the link to the session address, not one supplied by the caller', async () => {
    await redirectOf(() => requestPasswordChangeAction())

    expect(resetPasswordForEmail).toHaveBeenCalledWith('me@example.com', expect.anything())
  })

  it('surfaces a provider failure instead of claiming success', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limited' } } as never)

    const to = await redirectOf(() => requestPasswordChangeAction())

    expect(to).toContain('error=')
    expect(to).toContain('rate limited')
  })
})
