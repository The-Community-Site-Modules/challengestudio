'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'

/**
 * The post-challenge offer (PRD §12.2).
 *
 * External CTA only — nothing here takes payment, which §12.2 is explicit
 * about: native checkout waits until billing is separately designed.
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

export interface OfferInput {
  enabled: boolean
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
  /** One per line in the form. */
  bonuses: string
  closesAt: string
}

export async function saveOfferAction(
  workspaceSlug: string, challengeSlug: string, input: OfferInput
) {
  const challengeId = await authorize(workspaceSlug, challengeSlug)

  const headline = input.headline.trim()
  const ctaUrl   = input.ctaUrl.trim()

  // Only validated when it is going live — a half-written draft is fine.
  if (input.enabled) {
    if (!headline) return { success: false, error: 'A headline is required to turn the offer on.' }
    if (!ctaUrl)   return { success: false, error: 'A link is required to turn the offer on.' }
  }
  if (ctaUrl && !/^https?:\/\/\S+$/i.test(ctaUrl)) {
    return { success: false, error: 'The link must start with http:// or https://' }
  }
  if (input.closesAt && Number.isNaN(Date.parse(input.closesAt))) {
    return { success: false, error: 'That closing date could not be read.' }
  }

  const bonuses = input.bonuses
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const data = {
    enabled:  input.enabled,
    headline: headline || 'Your next step',
    body:     input.body.trim() || null,
    ctaLabel: input.ctaLabel.trim() || 'Get started',
    ctaUrl,
    bonuses:  bonuses.length > 0 ? bonuses : undefined,
    closesAt: input.closesAt ? new Date(input.closesAt) : null,
  }

  await db.offer.upsert({
    where:  { challengeId },
    update: data,
    create: { challengeId, ...data },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/offer`)
  revalidatePath(`/c/${challengeSlug}/offer`)
  return { success: true }
}

/**
 * Record a click through to the external page.
 *
 * PRD §8.1 step 43 asks creators to monitor offer clicks. Deliberately not
 * gated on being a participant: the offer page is reachable after a challenge
 * ends, and a click that is not counted is worse than one from a stranger.
 */
export async function recordOfferClickAction(offerId: string, participantId?: string) {
  const offer = await db.offer.findUnique({
    where:  { id: offerId },
    select: { id: true, enabled: true },
  })
  if (!offer || !offer.enabled) return { success: false }

  await db.offerClick.create({
    data: { offerId: offer.id, ...(participantId ? { participantId } : {}) },
  })
  return { success: true }
}
