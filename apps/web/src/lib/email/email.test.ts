import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sendEmail, renderWorkspaceInvitation } from './index'

const originalKey = process.env.RESEND_API_KEY

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  if (originalKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalKey
})

const message = {
  to: 'someone@example.com',
  subject: 'Subject',
  html: '<p>Body</p>',
  text: 'Body',
  trigger: 'workspace_invitation' as const,
}

describe('sendEmail driver selection', () => {
  it('reports sent:false when no API key is configured', async () => {
    delete process.env.RESEND_API_KEY

    const result = await sendEmail(message)

    // The console driver must never claim success — a caller that trusts it
    // would tell a user their invitation is on its way when it is not.
    expect(result.sent).toBe(false)
    expect(result.provider).toBe('console')
    expect(result.reason).toMatch(/RESEND_API_KEY/)
  })
})

describe('workspace invitation template', () => {
  const vars = {
    to: 'invited@example.com',
    workspaceName: 'Acme Coaching',
    inviterName: 'Robert Evans',
    roleLabel: 'an admin',
    acceptUrl: 'https://app.example.com/auth/invitation/tok-123',
    expiresAt: new Date('2026-09-01T00:00:00Z'),
  }

  it('names the workspace and inviter in the subject', () => {
    const rendered = renderWorkspaceInvitation(vars)
    expect(rendered.subject).toContain('Acme Coaching')
    expect(rendered.subject).toContain('Robert Evans')
  })

  it('carries the accept link in both the html and text parts', () => {
    const rendered = renderWorkspaceInvitation(vars)
    expect(rendered.html).toContain(vars.acceptUrl)
    expect(rendered.text).toContain(vars.acceptUrl)
  })

  it('always ships a plain-text alternative', () => {
    const rendered = renderWorkspaceInvitation(vars)
    expect(rendered.text.trim().length).toBeGreaterThan(0)
  })

  it('states the expiry date and the address the invite is bound to', () => {
    const rendered = renderWorkspaceInvitation(vars)
    // The email check in acceptInvitationAction is only fair if the recipient
    // is told which address the token belongs to.
    expect(rendered.text).toContain('invited@example.com')
    expect(rendered.text).toContain('September 1, 2026')
  })

  it('escapes html in caller-supplied values', () => {
    const rendered = renderWorkspaceInvitation({
      ...vars,
      workspaceName: '<script>alert(1)</script>',
      inviterName: 'Bob " onmouseover="x',
    })

    expect(rendered.html).not.toContain('<script>')
    expect(rendered.html).toContain('&lt;script&gt;')
    expect(rendered.html).not.toContain('onmouseover="x"')
  })

  it('tags the message with its trigger', () => {
    expect(renderWorkspaceInvitation(vars).trigger).toBe('workspace_invitation')
  })
})
