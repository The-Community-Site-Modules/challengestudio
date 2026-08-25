import type { EmailMessage } from '../index'

/**
 * Workspace invitation email.
 *
 * Plain inlined HTML rather than a component library: mail clients ignore most
 * CSS, and this needs no build step. Every message ships a text/plain part too —
 * some clients show it, and spam filters weigh its absence.
 */

export interface WorkspaceInvitationVars {
  to: string
  workspaceName: string
  inviterName: string
  roleLabel: string
  acceptUrl: string
  expiresAt: Date
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function renderWorkspaceInvitation(vars: WorkspaceInvitationVars): EmailMessage {
  const workspace = escapeHtml(vars.workspaceName)
  const inviter = escapeHtml(vars.inviterName)
  const role = escapeHtml(vars.roleLabel)
  const url = escapeHtml(vars.acceptUrl)
  const expires = formatExpiry(vars.expiresAt)

  const subject = `${vars.inviterName} invited you to ${vars.workspaceName} on Challenge Studio`

  const text = [
    `${vars.inviterName} has invited you to join ${vars.workspaceName} on Challenge Studio as ${vars.roleLabel}.`,
    ``,
    `Accept the invitation:`,
    vars.acceptUrl,
    ``,
    `This invitation expires on ${expires} and can only be accepted by ${vars.to}.`,
    ``,
    `If you were not expecting this, you can ignore this email.`,
  ].join('\n')

  const html = `
<div style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
    <tr>
      <td style="padding:32px 32px 8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#71717a;">Challenge Studio</p>
        <h1 style="margin:0;font-size:20px;line-height:1.35;color:#18181b;font-weight:600;">
          ${inviter} invited you to ${workspace}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 0;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">
          You have been invited to join <strong>${workspace}</strong> as <strong>${role}</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <a href="${url}"
           style="display:inline-block;padding:11px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">
          Accept invitation
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 8px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
          Or paste this link into your browser:<br />
          <span style="color:#3f3f46;word-break:break-all;">${url}</span>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 32px;border-top:1px solid #f4f4f5;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
          This invitation expires on ${expires} and can only be accepted by
          <strong style="color:#3f3f46;">${escapeHtml(vars.to)}</strong>.
          If you were not expecting it, you can ignore this email.
        </p>
      </td>
    </tr>
  </table>
</div>`.trim()

  return { to: vars.to, subject, html, text, trigger: 'workspace_invitation' }
}
