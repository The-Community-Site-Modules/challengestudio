'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'

/**
 * Live sessions (PRD §16).
 *
 * The challenge is resolved from the workspace the permission was checked
 * against plus the slug in the URL, never from an id the browser sent.
 */
async function authorize(workspaceSlug: string, challengeSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) redirect('/dashboard')

  await requirePermission(user.id, workspace.id, 'session.manage')

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  return challenge.id
}

export interface SessionInput {
  title: string
  description: string
  startsAt: string
  durationMinutes: string
  hostName: string
  joinUrl: string
  replayUrl: string
}

/** A join or replay link must be a real URL, or it is worse than no link. */
function badUrl(value: string): boolean {
  if (!value) return false
  return !/^https?:\/\/\S+$/i.test(value)
}

function validate(input: SessionInput): string | null {
  if (!input.title.trim())    return 'Give the session a title.'
  if (!input.startsAt)        return 'A date and time is required.'
  if (Number.isNaN(Date.parse(input.startsAt))) return 'That date could not be read.'
  if (badUrl(input.joinUrl))   return 'The join link must start with http:// or https://'
  if (badUrl(input.replayUrl)) return 'The replay link must start with http:// or https://'
  return null
}

function fields(input: SessionInput) {
  const minutes = parseInt(input.durationMinutes, 10)
  return {
    title:       input.title.trim(),
    startsAt:    new Date(input.startsAt),
    description: input.description.trim() || null,
    hostName:    input.hostName.trim() || null,
    joinUrl:     input.joinUrl.trim() || null,
    replayUrl:   input.replayUrl.trim() || null,
    durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
  }
}

function refresh(workspaceSlug: string, challengeSlug: string) {
  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/live-sessions`)
  revalidatePath(`/c/${challengeSlug}/hub`)
}

export async function createSessionAction(
  workspaceSlug: string, challengeSlug: string, input: SessionInput
) {
  const challengeId = await authorize(workspaceSlug, challengeSlug)
  const problem = validate(input)
  if (problem) return { success: false, error: problem }

  await db.liveSession.create({ data: { challengeId, ...fields(input) } })
  refresh(workspaceSlug, challengeSlug)
  return { success: true }
}

export async function updateSessionAction(
  workspaceSlug: string, challengeSlug: string, sessionId: string, input: SessionInput
) {
  const challengeId = await authorize(workspaceSlug, challengeSlug)
  const problem = validate(input)
  if (problem) return { success: false, error: problem }

  // The id came from the browser; it must belong to this challenge.
  const existing = await db.liveSession.findUnique({
    where:  { id: sessionId },
    select: { challengeId: true },
  })
  if (!existing || existing.challengeId !== challengeId) {
    return { success: false, error: 'That session is not in this challenge.' }
  }

  await db.liveSession.update({ where: { id: sessionId }, data: fields(input) })
  refresh(workspaceSlug, challengeSlug)
  return { success: true }
}

export async function deleteSessionAction(
  workspaceSlug: string, challengeSlug: string, sessionId: string
) {
  const challengeId = await authorize(workspaceSlug, challengeSlug)

  const existing = await db.liveSession.findUnique({
    where:  { id: sessionId },
    select: { challengeId: true },
  })
  if (!existing || existing.challengeId !== challengeId) {
    return { success: false, error: 'That session is not in this challenge.' }
  }

  await db.liveSession.delete({ where: { id: sessionId } })
  refresh(workspaceSlug, challengeSlug)
  return { success: true }
}
