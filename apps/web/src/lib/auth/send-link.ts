/**
 * Email someone a sign-in link that works in any browser.
 *
 * Supabase's own emails link with a PKCE code, which completes only in the
 * browser that asked for it. People register on a laptop and open the email
 * on their phone, so the link failed — and changing Supabase's templates needs
 * dashboard access this project's maintainers do not all have.
 *
 * So the app sends these itself: Supabase generates the link (admin API, no
 * email), and the token hash goes into our own email, pointing straight at
 * /api/auth/callback, which verifies it with no cookie needed. See
 * lib/auth/email-link for the receiving side.
 *
 * If our email cannot be sent — no provider configured, provider refusing —
 * it falls back to Supabase sending its usual same-browser link, so a mail
 * outage degrades the link instead of losing it.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { renderAuthLink, sendEmail, type AuthLinkKind } from '@/lib/email'
import { checkRateLimit, rateLimitMessage } from '@/lib/rate-limit'
import { isEmailOtpType } from '@/lib/auth/email-link'

export interface SendAuthLinkInput {
  kind: AuthLinkKind
  email: string
  /** Our callback URL, with its own next / challenge / name. */
  callbackUrl: string
  /** Stored on the account if this creates one. */
  fullName?: string
  challengeTitle?: string | null
  workspaceName?: string | null
  /** The workspace's From name, reply-to and button colour, when there is one. */
  senderName?: string | null
  replyTo?: string | null
  buttonColor?: string | null
}

export type SendAuthLinkResult =
  | { ok: true; via: 'app' | 'supabase' | 'none' }
  | { ok: false; error: string }

/**
 * The challenge a sign-in link was asked for on, read from where it leads
 * (`/c/<slug>/…`), so the email can name it and wear its workspace's branding.
 * Nothing for any other destination.
 */
export async function challengeContext(next: string | null | undefined): Promise<
  Pick<SendAuthLinkInput, 'challengeTitle' | 'workspaceName' | 'senderName' | 'replyTo' | 'buttonColor'>
> {
  const slug = next ? /^\/c\/([^/?#]+)/.exec(next)?.[1] : undefined
  if (!slug) return {}
  const challenge = await db.challenge.findFirst({
    where:  { slug },
    select: { title: true, workspace: { select: { name: true, senderName: true, supportEmail: true, primaryColor: true } } },
  })
  if (!challenge) return {}
  return {
    challengeTitle: challenge.title,
    workspaceName:  challenge.workspace.name,
    senderName:     challenge.workspace.senderName,
    replyTo:        challenge.workspace.supportEmail,
    buttonColor:    challenge.workspace.primaryColor,
  }
}

/** The callback URL plus the token, ready to put in an email. */
export function tokenLink(callbackUrl: string, tokenHash: string, type: string): string {
  const join = callbackUrl.includes('?') ? '&' : '?'
  return `${callbackUrl}${join}token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`
}

export async function sendAuthLink(input: SendAuthLinkInput): Promise<SendAuthLinkResult> {
  const email = input.email.trim().toLowerCase()

  const limit = await checkRateLimit('email_link', email)
  if (!limit.allowed) return { ok: false, error: rateLimitMessage(limit) }

  const data = input.fullName ? { full_name: input.fullName } : undefined
  const { data: generated, error } = await createAdminClient().auth.admin.generateLink(
    input.kind === 'reset'
      ? { type: 'recovery', email, options: { redirectTo: input.callbackUrl } }
      : { type: 'magiclink', email, options: { redirectTo: input.callbackUrl, ...(data ? { data } : {}) } }
  )

  // A reset for an address with no account: say nothing either way, as
  // Supabase did — the form must not reveal who has an account.
  if (error && input.kind === 'reset' && (error.status === 404 || /not.?found/i.test(error.message))) {
    return { ok: true, via: 'none' }
  }

  const hash = generated?.properties?.hashed_token
  if (!error && hash) {
    const verification = generated.properties.verification_type
    const type = isEmailOtpType(verification) ? verification : input.kind === 'reset' ? 'recovery' : 'email'
    const message = renderAuthLink({
      kind:           input.kind,
      to:             email,
      url:            tokenLink(input.callbackUrl, hash, type),
      challengeTitle: input.challengeTitle,
      workspaceName:  input.workspaceName,
      buttonColor:    input.buttonColor,
    })
    const sent = await sendEmail({ ...message, fromName: input.senderName, replyTo: input.replyTo })
    if (sent.sent) return { ok: true, via: 'app' }
    console.error('[auth/send-link] app email not sent, falling back to Supabase', { kind: input.kind, reason: sent.reason })
  } else {
    console.error('[auth/send-link] could not generate a link, falling back to Supabase', { kind: input.kind, error: error?.message })
  }

  return supabaseFallback(input, email, data)
}

async function supabaseFallback(
  input: SendAuthLinkInput,
  email: string,
  data: Record<string, string> | undefined,
): Promise<SendAuthLinkResult> {
  const supabase = await createClient()
  const { error } = input.kind === 'reset'
    ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: input.callbackUrl })
    : await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: input.callbackUrl, ...(data ? { data } : {}) },
      })
  return error ? { ok: false, error: error.message } : { ok: true, via: 'supabase' }
}
