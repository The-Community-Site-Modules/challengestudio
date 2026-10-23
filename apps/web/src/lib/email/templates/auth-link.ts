import type { EmailMessage } from '../index'
import { foregroundFor, isHexColor } from '@/lib/branding'

/**
 * The emails that carry a sign-in link: registering for a challenge, signing
 * in by link, and resetting a password.
 *
 * Supabase used to send these from its own templates. The app sends them now
 * so the link can verify in any browser — see lib/auth/send-link. Same style
 * as the invitation email: inlined HTML, plus a text part.
 */

export type AuthLinkKind = 'register' | 'sign_in' | 'reset'

export interface AuthLinkVars {
  kind: AuthLinkKind
  to: string
  url: string
  /** For a registration, or a sign-in that started on a challenge's page. */
  challengeTitle?: string | null
  workspaceName?: string | null
  /** The workspace's primary colour, for the button. */
  buttonColor?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface Copy { subject: string; heading: string; intro: string; button: string; ignore: string }

function copyFor(vars: AuthLinkVars): Copy {
  const challenge = vars.challengeTitle?.trim()
  switch (vars.kind) {
    case 'register':
      return {
        subject: challenge ? `Confirm your place in ${challenge}` : 'Confirm your registration',
        heading: challenge ? `Confirm your place in ${challenge}` : 'Confirm your registration',
        intro:   'Open the link below to finish registering. It works on any device.',
        button:  'Confirm my place',
        ignore:  'If you did not register, you can ignore this email — nothing happens until the link is opened.',
      }
    case 'sign_in':
      return {
        subject: challenge ? `Your sign-in link for ${challenge}` : 'Your sign-in link',
        heading: challenge ? `Sign in to ${challenge}` : 'Sign in to Challenge Studio',
        intro:   'Open the link below to sign in. It works on any device.',
        button:  'Sign in',
        ignore:  'If you did not ask to sign in, you can ignore this email.',
      }
    case 'reset':
      return {
        subject: 'Reset your password',
        heading: 'Reset your password',
        intro:   'Open the link below to choose a new password. It works on any device.',
        button:  'Choose a new password',
        ignore:  'If you did not ask for this, you can ignore this email — your password stays as it is.',
      }
  }
}

export function renderAuthLink(vars: AuthLinkVars): EmailMessage {
  const copy   = copyFor(vars)
  const url    = escapeHtml(vars.url)
  const from   = vars.workspaceName?.trim() || 'Challenge Studio'
  const button = isHexColor(vars.buttonColor) ? vars.buttonColor : '#18181b'
  const label  = foregroundFor(button)

  const text = [
    copy.heading,
    ``,
    copy.intro,
    vars.url,
    ``,
    `The link can be used once and expires after a short time.`,
    copy.ignore,
  ].join('\n')

  const html = `
<div style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
    <tr>
      <td style="padding:32px 32px 8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#71717a;">${escapeHtml(from)}</p>
        <h1 style="margin:0;font-size:20px;line-height:1.35;color:#18181b;font-weight:600;">
          ${escapeHtml(copy.heading)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 0;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${escapeHtml(copy.intro)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <a href="${url}"
           style="display:inline-block;padding:11px 20px;background:${button};color:${label};text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">
          ${escapeHtml(copy.button)}
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
          The link can be used once and expires after a short time. ${escapeHtml(copy.ignore)}
        </p>
      </td>
    </tr>
  </table>
</div>`.trim()

  const trigger = vars.kind === 'register' ? 'account_setup' : vars.kind === 'reset' ? 'password_reset' : 'sign_in_link'
  return { to: vars.to, subject: copy.subject, html, text, trigger }
}
