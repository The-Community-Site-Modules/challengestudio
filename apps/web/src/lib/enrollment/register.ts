/**
 * Who may join a challenge, and the enrolment that follows a magic link.
 *
 * Deliberately NOT a 'use server' module. Everything exported from one of
 * those becomes an endpoint the browser can call with arguments of its own
 * choosing — and enrolAfterAuth takes a user id. It used to live in
 * app/c/[challengeSlug]/actions.ts, which let anyone enrol any account into
 * any challenge and rename them on the way. Only the auth callback, which has
 * just verified the session, may call it.
 */

import { db } from '@/lib/db'

/**
 * Where a new participant starts. A challenge that requires approval admits
 * nobody automatically: PENDING is the waiting room.
 */
export function initialParticipantStatus(requiresApproval: boolean): 'PENDING' | 'REGISTERED' {
  return requiresApproval ? 'PENDING' : 'REGISTERED'
}

/**
 * Statuses that are taking part. PENDING is waiting for approval and DROPPED
 * was turned away or left — neither may open, submit, post or upload.
 */
export const PARTICIPATING_STATUSES = ['REGISTERED', 'ACTIVE', 'COMPLETED'] as const

export function isParticipating(status: string | null | undefined): boolean {
  return (PARTICIPATING_STATUSES as readonly string[]).includes(status ?? '')
}

export interface RegistrationGateInput {
  status: string
  isPublic: boolean
  registrationOpensAt: Date | null
  registrationClosesAt: Date | null
  maxParticipants: number | null
  participantCount: number
}

/**
 * Why a new registration is refused, or null when it may go ahead.
 *
 * One function for both ways in — the form and the magic-link callback — so
 * the two cannot reach different answers.
 */
export function registrationBlocker(c: RegistrationGateInput, now = new Date()): string | null {
  if (!['PUBLISHED', 'ACTIVE'].includes(c.status)) return 'Registration is not open.'
  if (!c.isPublic) return 'This challenge is private.'
  if (c.registrationOpensAt && c.registrationOpensAt > now) return 'Registration is not open yet.'
  if (c.registrationClosesAt && c.registrationClosesAt < now) return 'Registration has closed.'
  if (c.maxParticipants && c.participantCount >= c.maxParticipants) return 'This challenge is full.'
  return null
}

/** Enrolment was refused for a reason the person should be told. */
export class EnrollmentRefusedError extends Error {}

/**
 * Create the Profile and Participant after the magic link is clicked.
 *
 * The challenge id arrives on the callback URL, which the person can edit, so
 * every gate the form applied is applied again here. Someone already enrolled
 * is left alone — the upsert is idempotent and re-clicking a link is normal.
 */
export async function enrollAfterAuth(
  userId:      string,
  email:       string,
  fullName:    string,
  challengeId: string
): Promise<void> {
  const challenge = await db.challenge.findUnique({
    where:  { id: challengeId },
    select: {
      status: true, isPublic: true, requiresApproval: true, maxParticipants: true,
      registrationOpensAt: true, registrationClosesAt: true,
      _count: { select: { participants: true } },
    },
  })
  if (!challenge) throw new Error(`enrollAfterAuth: challenge ${challengeId} not found`)

  const existing = await db.participant.findUnique({
    where:  { challengeId_profileId: { challengeId, profileId: userId } },
    select: { id: true },
  })
  if (existing) return

  const blocked = registrationBlocker({
    status:               challenge.status as string,
    isPublic:             challenge.isPublic,
    registrationOpensAt:  challenge.registrationOpensAt,
    registrationClosesAt: challenge.registrationClosesAt,
    maxParticipants:      challenge.maxParticipants,
    participantCount:     challenge._count.participants,
  })
  if (blocked) throw new EnrollmentRefusedError(blocked)

  // The auth trigger normally created this; guard against the race anyway.
  await db.profile.upsert({
    where:  { id: userId },
    update: { fullName: fullName || undefined },
    create: { id: userId, email, fullName: fullName || null },
  })

  await db.participant.upsert({
    where:  { challengeId_profileId: { challengeId, profileId: userId } },
    update: {},
    create: {
      challengeId,
      profileId: userId,
      status:    initialParticipantStatus(challenge.requiresApproval) as never,
    },
  })
}
