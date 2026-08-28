'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'
import { messageFor, type Trigger } from '@/lib/communications'

/**
 * Creator control over challenge email (PRD §15.1): enable or disable each
 * message type and edit a controlled set of subject/body fields.
 *
 * The challenge id is never taken from the client — it is resolved from the
 * workspace the permission was checked against plus the slug in the URL.
 */
async function authorize(workspaceSlug: string, challengeSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) redirect('/dashboard')

  await requirePermission(user.id, workspace.id, 'challenge.edit')

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  return challenge.id
}

const MAX_SUBJECT = 200
const MAX_BODY    = 5000

export async function saveTemplateAction(
  workspaceSlug: string,
  challengeSlug: string,
  trigger: string,
  input: { enabled: boolean; subject: string; body: string }
) {
  const challengeId = await authorize(workspaceSlug, challengeSlug)

  const definition = messageFor(trigger as Trigger)
  if (!definition) return { success: false, error: 'Unknown message type.' }

  const subject = input.subject.trim()
  const body    = input.body.trim()
  if (subject.length > MAX_SUBJECT) return { success: false, error: 'Subject is too long.' }
  if (body.length > MAX_BODY)       return { success: false, error: 'Body is too long.' }

  // Blank means "use the default" rather than an empty email, so the column
  // goes back to null instead of storing "".
  await db.messageTemplate.upsert({
    where:  { challengeId_trigger: { challengeId, trigger } },
    update: { enabled: input.enabled, subject: subject || null, body: body || null },
    create: {
      challengeId, trigger,
      enabled: input.enabled,
      subject: subject || null,
      body:    body    || null,
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/communications`)
  return { success: true }
}
