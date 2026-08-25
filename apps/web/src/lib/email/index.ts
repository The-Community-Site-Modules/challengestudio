/**
 * Email service abstraction.
 *
 * The PRD (§19, §32) asks for an abstraction rather than a hard dependency on
 * one provider, so nothing outside this folder imports `resend`. Swapping
 * provider means writing a new driver below and changing `selectDriver()` —
 * trigger logic and templates stay untouched.
 *
 * Drivers:
 *   resend  — used when RESEND_API_KEY is set
 *   console — fallback: logs the message and reports `sent: false`
 *
 * The console driver never pretends a message went out. Callers get
 * `sent: false` with a reason, so a missing API key surfaces as "invitation
 * created but email not sent" rather than a silent black hole.
 *
 * Not yet implemented (Milestone 8, Communications): message_deliveries
 * logging, idempotency keys, unsubscribe preferences. Security and
 * transactional mail — verification, password reset, invitations — must never
 * be suppressed by unsubscribe preferences (PRD §15.2).
 */

export type EmailTrigger =
  | 'workspace_invitation'
  | 'registration_confirm'
  | 'account_setup'
  | 'challenge_starting'
  | 'day_available'
  | 'session_reminder'
  | 'inactivity_nudge'
  | 'submission_feedback'
  | 'milestone_earned'
  | 'completion'
  | 'offer_closing'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  trigger: EmailTrigger
}

export interface SendResult {
  sent: boolean
  provider: 'resend' | 'console'
  id?: string
  /** Present when sent is false. Safe to show in server logs, not to users. */
  reason?: string
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

interface EmailDriver {
  name: SendResult['provider']
  send(message: EmailMessage, from: string): Promise<SendResult>
}

const consoleDriver: EmailDriver = {
  name: 'console',
  async send(message) {
    // eslint-disable-next-line no-console
    console.warn(
      `[email] RESEND_API_KEY is not set — message not sent.\n` +
      `        to:      ${message.to}\n` +
      `        subject: ${message.subject}\n` +
      `        trigger: ${message.trigger}`
    )
    return { sent: false, provider: 'console', reason: 'RESEND_API_KEY is not set' }
  },
}

const resendDriver: EmailDriver = {
  name: 'resend',
  async send(message, from) {
    // Imported lazily: `resend` is an optional dependency, so a deployment
    // without it must still build and run on the console driver.
    const { Resend } = await import('resend')
    const client = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await client.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })

    if (error) {
      return { sent: false, provider: 'resend', reason: error.message }
    }
    return { sent: true, provider: 'resend', ...(data?.id ? { id: data.id } : {}) }
  },
}

function selectDriver(): EmailDriver {
  return process.env.RESEND_API_KEY ? resendDriver : consoleDriver
}

function fromAddress(): string {
  const address = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
  const name = process.env.EMAIL_FROM_NAME || 'Challenge Studio'
  return `${name} <${address}>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send one transactional email.
 *
 * Never throws. A provider outage must not take down the action that triggered
 * the send — an invitation still exists whether or not its email went out, and
 * the recipient can be re-invited. Callers decide what to tell the user based
 * on `sent`.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const driver = selectDriver()
  try {
    return await driver.send(message, fromAddress())
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    // eslint-disable-next-line no-console
    console.error(`[email] ${driver.name} driver threw while sending "${message.trigger}": ${reason}`)
    return { sent: false, provider: driver.name, reason }
  }
}

export { renderWorkspaceInvitation } from './templates/workspace-invitation'
