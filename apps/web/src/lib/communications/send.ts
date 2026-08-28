/**
 * Trigger evaluation and delivery (milestone 8).
 *
 * PRD §27 asks for three things, and each is enforced by the database rather
 * than by remembering to do it:
 *
 *   "sent once"                → unique idempotency_key on message_deliveries.
 *                                A second attempt is refused by Postgres.
 *   "failures are observable"  → a failed send is a row with status 'failed'
 *                                and the provider's reason, not a silence.
 *   "unsubscribe respected"    → checked before sending, and scoped to one
 *                                workspace (§15.2).
 *
 * A message that is deliberately not sent is logged too, with why. Otherwise
 * "did that nudge go out?" has no answer, which is the same problem as a
 * silent failure wearing a different hat.
 */

import { db } from '@/lib/db'
import { sendEmail, type EmailTrigger } from '@/lib/email'
import { messageFor, isEssential, render, type Trigger } from './catalogue'

export interface DispatchInput {
  trigger: Trigger
  workspaceId: string
  challengeId?: string
  participantId?: string
  /** The person this is for. Their preferences and profile are read from it. */
  profileId?: string
  to: string
  /**
   * Unique per thing-that-happened, e.g. `${participantId}:completion`.
   * This is what makes "sent once" true.
   */
  idempotencyKey: string
  /** Values for the template's declared variables. */
  values: Record<string, string | undefined>
}

export type DispatchStatus =
  | 'sent' | 'failed' | 'duplicate'
  | 'skipped_unsubscribed' | 'skipped_disabled' | 'skipped_unknown_trigger'

export interface DispatchResult {
  status: DispatchStatus
  reason?: string
}

/** Postgres refusing a duplicate is the mechanism working, not a failure. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e &&
    (e as { code?: string }).code === 'P2002'
}

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const definition = messageFor(input.trigger)
  if (!definition) {
    return { status: 'skipped_unknown_trigger', reason: `no message defined for ${input.trigger}` }
  }

  // Claim the key first. If this row cannot be written, the message has already
  // been handled and nothing further should happen — including the send.
  let deliveryId: string
  try {
    const row = await db.messageDelivery.create({
      data: {
        workspaceId:    input.workspaceId,
        recipientEmail: input.to,
        trigger:        input.trigger,
        status:         'pending',
        idempotencyKey: input.idempotencyKey,
        ...(input.challengeId   ? { challengeId: input.challengeId }     : {}),
        ...(input.participantId ? { participantId: input.participantId } : {}),
      },
      select: { id: true },
    })
    deliveryId = row.id
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'duplicate' }
    throw e
  }

  const settle = async (status: DispatchStatus, extra: Record<string, string> = {}) => {
    await db.messageDelivery.update({
      where: { id: deliveryId },
      data:  { status, ...extra },
    })
    return { status, ...(extra.error ? { reason: extra.error } : {}) } as DispatchResult
  }

  // Has the creator turned this message off for this challenge?
  if (input.challengeId) {
    const template = await db.messageTemplate.findUnique({
      where:  { challengeId_trigger: { challengeId: input.challengeId, trigger: input.trigger } },
      select: { enabled: true, subject: true, body: true },
    })
    if (template && !template.enabled) {
      return settle('skipped_disabled')
    }

    return actuallySend(input, definition.defaultSubject, definition.defaultBody, template, settle)
  }

  return actuallySend(input, definition.defaultSubject, definition.defaultBody, null, settle)
}

async function actuallySend(
  input: DispatchInput,
  defaultSubject: string,
  defaultBody: string,
  template: { subject: string | null; body: string | null } | null,
  settle: (status: DispatchStatus, extra?: Record<string, string>) => Promise<DispatchResult>
): Promise<DispatchResult> {
  // §15.2: access and security mail ignores preferences entirely, and the
  // check is scoped to one workspace so opting out of this one says nothing
  // about any other.
  if (!isEssential(input.trigger) && input.profileId) {
    const pref = await db.notificationPreference.findUnique({
      where: {
        profileId_workspaceId: { profileId: input.profileId, workspaceId: input.workspaceId },
      },
      select: { unsubscribed: true },
    })
    if (pref?.unsubscribed) return settle('skipped_unsubscribed')
  }

  const subject = render(template?.subject || defaultSubject, input.trigger, input.values)
  const body    = render(template?.body    || defaultBody,    input.trigger, input.values)

  const result = await sendEmail({
    to:      input.to,
    subject,
    text:    body,
    html:    `<p>${body.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`,
    trigger: input.trigger as EmailTrigger,
  })

  return result.sent
    ? settle('sent',   { provider: result.provider })
    : settle('failed', { provider: result.provider, error: result.reason ?? 'unknown' })
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/** Whether this person has opted out of non-essential mail from one workspace. */
export async function isUnsubscribed(profileId: string, workspaceId: string): Promise<boolean> {
  const pref = await db.notificationPreference.findUnique({
    where:  { profileId_workspaceId: { profileId, workspaceId } },
    select: { unsubscribed: true },
  })
  return pref?.unsubscribed ?? false
}

/**
 * Set the preference for one workspace.
 *
 * Upsert on (profile, workspace) so it only ever touches that pair — the whole
 * point of §15.2's warning about unsubscribing someone from unrelated products.
 */
export async function setUnsubscribed(
  profileId: string, workspaceId: string, unsubscribed: boolean
) {
  await db.notificationPreference.upsert({
    where:  { profileId_workspaceId: { profileId, workspaceId } },
    update: { unsubscribed },
    create: { profileId, workspaceId, unsubscribed },
  })
}
