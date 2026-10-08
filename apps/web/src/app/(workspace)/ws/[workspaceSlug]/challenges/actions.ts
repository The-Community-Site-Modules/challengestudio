'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'
import { avoidReserved } from '@/lib/slugs/reserved'
import { isValidTimeZone, zonedLocalToDate } from '@/lib/time/zoned'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  // Step 1 — Foundation
  title:            string
  slug:             string
  description:      string
  /** null clears it — removing a cover is a real thing to want. */
  coverImageUrl?:   string | null
  // Step 2 — Outcome
  promise:          string
  outcome:          string
  startingPoint:    string
  successDefinition: string
  // Step 3 — Mode
  mode:             string
  // Step 4 — Schedule
  timezone:         string
  startsAt:         string
  endsAt:           string
  registrationOpensAt:  string
  registrationClosesAt: string
  // Step 5 — Audience
  isPublic:         boolean
  maxParticipants:  number | null
  requiresApproval: boolean
  // Steps 6–8 — catch-all settings
  settings:         Record<string, unknown>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * A challenge slug nobody else is using.
 *
 * The public page is `/c/<slug>` with no workspace in the URL, so a slug has to
 * be unique across the whole platform, not just within one workspace. It used
 * to be checked per workspace only, and every `/c/` route resolved it with
 * findFirst — so two workspaces picking "30-day-fitness" sent one's
 * participants into the other's challenge.
 *
 * A title with no Latin characters slugifies to nothing; fall back rather than
 * produce "-2".
 */
async function freeChallengeSlug(base: string): Promise<string> {
  const slug = avoidReserved(base || 'challenge')
  const taken = await db.challenge.findFirst({ where: { slug }, select: { id: true } })
  return taken ? `${slug}-${Date.now().toString(36)}` : slug
}

function modeToEnum(mode: string): string {
  const map: Record<string, string> = {
    marketing:  'SELF_PACED',
    cohort:     'COHORT',
    evergreen:  'EVERGREEN',
    paid:       'SELF_PACED',
    internal:   'SELF_PACED',
    team:       'COHORT',
    habit:      'SPRINT',
    milestone:  'DRIP',
    SELF_PACED: 'SELF_PACED',
    COHORT:     'COHORT',
    LIVE_EVENT: 'LIVE_EVENT',
    DRIP:       'DRIP',
    SPRINT:     'SPRINT',
    EVERGREEN:  'EVERGREEN',
  }
  if (map[mode]) return map[mode]
  // The settings page sends enum names in lower case ("drip", "live_event",
  // "certification"). Only "cohort" and "evergreen" happened to be in the map,
  // so choosing any other mode there silently saved SELF_PACED.
  const upper = mode.toUpperCase()
  return CHALLENGE_MODES.includes(upper) ? upper : 'SELF_PACED'
}

const CHALLENGE_MODES = [
  'SELF_PACED', 'COHORT', 'LIVE_EVENT', 'DRIP', 'SPRINT', 'EVERGREEN', 'CERTIFICATION', 'CHALLENGE_LADDER',
]

/**
 * A date from the wizard or settings, as an instant in the challenge's zone.
 *
 * The wizard sends bare dates ("2026-10-10"). `new Date()` reads those as UTC
 * midnight — the evening before for anyone west of Greenwich — so a cohort in
 * New York unlocked every day a day early. Read as 00:00 on the challenge's
 * own clock instead, matching the settings page. ISO instants pass through.
 */
function scheduleDate(value: string | undefined, timeZone: string | null | undefined): Date | null {
  if (!value) return null
  return zonedLocalToDate(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value, timeZone)
}

/**
 * A capacity is a whole number of people, at least one — or none at all.
 * A negative or zero value used to be stored as given, and registration's
 * "count >= max" test then called the challenge full before anyone joined.
 */
function badCapacity(v: number | null | undefined): boolean {
  return v !== null && v !== undefined && !(Number.isInteger(v) && v >= 1 && v <= 1_000_000)
}

/** The wizard's email switches, by the trigger each one controls. */
const WIZARD_EMAIL_TRIGGERS: Record<string, string> = {
  registration: 'registration_confirm',
  start:        'challenge_starting',
  daily:        'day_available',
  reminder:     'session_reminder',
  inactivity:   'inactivity_nudge',
  completion:   'completion',
}

/**
 * Apply the wizard's communications and offer steps.
 *
 * Both were collected, stored in `settings` and then read by nothing: an
 * email switched off in the wizard was still sent, and an offer set up there
 * never appeared — the offer page and dispatch read their own tables. This
 * writes those rows, the same ones the Communications and Offer pages edit.
 */
async function applyWizardSettings(
  challengeId: string,
  settings: Record<string, unknown>,
  timeZone: string | null | undefined
) {
  const triggers = (settings.emailTriggers ?? {}) as Record<string, unknown>
  const disabled = Object.entries(WIZARD_EMAIL_TRIGGERS)
    .filter(([key]) => triggers[key] === false)
    .map(([, trigger]) => ({ challengeId, trigger, enabled: false }))
  if (disabled.length > 0) {
    await db.messageTemplate.createMany({ data: disabled, skipDuplicates: true })
  }

  const offer = (settings.offer ?? {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const headline = text(offer.headline)
  const ctaUrl   = text(offer.url)
  // Only a complete offer goes live — the same rule saveOfferAction applies.
  if (offer.enabled === true && headline && /^https?:\/\/\S+$/i.test(ctaUrl)) {
    const bonuses = text(offer.bonuses).split('\n').map((b) => b.trim()).filter(Boolean)
    await db.offer.create({
      data: {
        challengeId,
        enabled:  true,
        headline,
        ctaLabel: text(offer.ctaText) || 'Get started',
        ctaUrl,
        bonuses,
        closesAt: scheduleDate(text(offer.deadline) || undefined, timeZone),
      },
    })
  }
}

async function resolveWorkspace(workspaceSlug: string) {
  const ws = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true, slug: true },
  })
  if (!ws) redirect('/dashboard')
  return ws
}

/**
 * Confirm a challenge id really belongs to this workspace.
 *
 * Build Plan §4 rule 1: every tenant-owned row is queried through its
 * workspace_id. The permission check answers "may this person edit challenges
 * *here*" — it says nothing about whether the id they sent is one of ours.
 * Both ids arrive from the browser, so without this an owner of one workspace
 * could edit, publish, close or delete another tenant's challenge by passing
 * its id alongside their own slug.
 *
 * Prisma connects as the table owner and is exempt from row-level security,
 * so this check is the only thing enforcing the boundary.
 */
async function requireChallengeIn(workspaceId: string, workspaceSlug: string, challengeId: string) {
  const challenge = await db.challenge.findFirst({
    where:  { id: challengeId, workspaceId },
    select: { id: true, slug: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)
  return challenge
}

/**
 * The same, for a step. A step belongs to a workspace through its challenge,
 * so the ownership question is asked in one query rather than two.
 */
async function requireStepIn(workspaceId: string, workspaceSlug: string, stepId: string) {
  const step = await db.challengeStep.findFirst({
    where:  { id: stepId, challenge: { workspaceId } },
    select: { id: true, challengeId: true },
  })
  if (!step) redirect(`/ws/${workspaceSlug}/challenges`)
  return step
}

// ─── Create Challenge (from wizard) ──────────────────────────────────────────

export async function createChallengeAction(workspaceSlug: string, data: WizardData) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.create')

  // Derived from a title as often as typed, so a clash is nudged aside
  // rather than refused.
  const slug = await freeChallengeSlug(slugify(data.slug || data.title))

  // Never store a zone Intl cannot read — every participant page formats
  // dates with it, and an unknown one throws for every visitor.
  if (data.timezone && !isValidTimeZone(data.timezone)) {
    return { error: 'That timezone is not recognised.' }
  }
  if (badCapacity(data.maxParticipants)) {
    return { error: 'The participant limit must be a whole number of at least 1.' }
  }

  const challenge = await db.challenge.create({
    data: {
      workspaceId:         ws.id,
      slug,
      title:               data.title,
      ...(data.coverImageUrl    && { coverImageUrl: data.coverImageUrl }),
      description:         data.description || null,
      promise:             data.promise     || null,
      outcome:             data.outcome     || null,
      startingPoint:       data.startingPoint     || null,
      successDefinition:   data.successDefinition || null,
      mode:                modeToEnum(data.mode) as never,
      status:              'DRAFT' as never,
      timezone:            data.timezone || null,
      startsAt:             scheduleDate(data.startsAt, data.timezone),
      endsAt:               scheduleDate(data.endsAt, data.timezone),
      registrationOpensAt:  scheduleDate(data.registrationOpensAt, data.timezone),
      registrationClosesAt: scheduleDate(data.registrationClosesAt, data.timezone),
      isPublic:            data.isPublic,
      maxParticipants:     data.maxParticipants || null,
      requiresApproval:    data.requiresApproval,
      settings:            (data.settings || {}) as never,
    },
  })

  await applyWizardSettings(challenge.id, (data.settings || {}) as Record<string, unknown>, data.timezone)

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  redirect(`/ws/${workspaceSlug}/challenges/${challenge.slug}/builder`)
}

// saveDraftAction was removed. Nothing in the UI called it, but as an exported
// server action it was still an endpoint — and its upsert keyed on the slug the
// browser sent, so a draft save could overwrite any existing challenge in the
// workspace, published ones included, with only challenge.create.

// ─── Update Challenge ────────────────────────────────────────────────────────

export async function updateChallengeAction(challengeId: string, workspaceSlug: string, data: Partial<WizardData>) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  if (data.timezone && !isValidTimeZone(data.timezone)) {
    return { error: 'That timezone is not recognised.' }
  }
  if (badCapacity(data.maxParticipants)) {
    return { error: 'The participant limit must be a whole number of at least 1.' }
  }

  // Changing the slug changes the public URL, so it goes through the same
  // reserved-word guard as creation — otherwise a challenge could be renamed
  // onto a route the app owns and quietly shadow it.
  let nextSlug: string | undefined
  if (data.slug !== undefined) {
    const cleaned = slugify(data.slug)
    if (!cleaned) return { error: 'That slug is not usable. Try something else.' }
    nextSlug = avoidReserved(cleaned)

    // Across every workspace: /c/<slug> carries no workspace to tell them apart.
    const clash = await db.challenge.findFirst({
      where: { slug: nextSlug, id: { not: challengeId } },
      select: { id: true },
    })
    if (clash) return { error: 'That URL is already taken. Try something else.' }
  }

  const challenge = await db.challenge.update({
    where: { id: challengeId },
    data: {
      ...(nextSlug              && { slug: nextSlug }),
      ...(data.title            && { title: data.title }),
      ...(data.description      !== undefined && { description: data.description }),
      ...(data.coverImageUrl    !== undefined && { coverImageUrl: data.coverImageUrl }),
      ...(data.promise          !== undefined && { promise: data.promise }),
      ...(data.outcome          !== undefined && { outcome: data.outcome }),
      ...(data.startingPoint    !== undefined && { startingPoint: data.startingPoint }),
      ...(data.successDefinition !== undefined && { successDefinition: data.successDefinition }),
      ...(data.mode             && { mode: modeToEnum(data.mode) as never }),
      // '' becomes null: pages fall back with `?? 'UTC'`, which an empty
      // string slips past and Intl then rejects.
      ...(data.timezone         !== undefined && { timezone: data.timezone || null }),
      ...(data.startsAt         !== undefined && { startsAt: scheduleDate(data.startsAt, data.timezone) }),
      ...(data.endsAt           !== undefined && { endsAt:   scheduleDate(data.endsAt, data.timezone) }),
      ...(data.registrationOpensAt  !== undefined && { registrationOpensAt:  scheduleDate(data.registrationOpensAt, data.timezone) }),
      ...(data.registrationClosesAt !== undefined && { registrationClosesAt: scheduleDate(data.registrationClosesAt, data.timezone) }),
      ...(data.isPublic         !== undefined && { isPublic: data.isPublic }),
      ...(data.maxParticipants  !== undefined && { maxParticipants: data.maxParticipants }),
      ...(data.requiresApproval !== undefined && { requiresApproval: data.requiresApproval }),
      ...(data.settings         !== undefined && { settings: data.settings as never }),
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${challenge.slug}`)
  revalidatePath(`/c/${challenge.slug}`)
  return { slug: challenge.slug }
}

// ─── Publish Challenge ───────────────────────────────────────────────────────

export async function publishChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.publish')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  // The publish gate (Build Plan §1.1): schedule, at least one step, and the
  // fields the public registration page is built from. Publishing with those
  // empty ships a live page with nothing on it, which is worse than a draft.
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    select: {
      title: true, slug: true, description: true, promise: true, startsAt: true,
      endsAt: true, registrationOpensAt: true, registrationClosesAt: true,
      steps: { select: { id: true, isPublished: true, _count: { select: { contentBlocks: true } } } },
    },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  const blank = (v: string | null) => !v || v.trim().length === 0
  const errors: string[] = []

  if (blank(challenge.title)) errors.push('Challenge title is required.')
  if (blank(challenge.slug))  errors.push('A URL slug is required.')

  // Public-page fields.
  if (blank(challenge.promise)) {
    errors.push('Add the one-line promise — it is the headline on the registration page.')
  }
  if (blank(challenge.description)) {
    errors.push('Add a short description — it is what people read before signing up.')
  }

  // Schedule.
  if (!challenge.startsAt) errors.push('A start date is required.')
  if (challenge.startsAt && challenge.endsAt && challenge.endsAt < challenge.startsAt) {
    errors.push('The end date cannot be before the start date.')
  }
  if (challenge.registrationOpensAt && challenge.registrationClosesAt &&
      challenge.registrationClosesAt < challenge.registrationOpensAt) {
    errors.push('Registration cannot close before it opens.')
  }

  // Content.
  if (challenge.steps.length === 0) {
    errors.push('At least one step is required.')
  } else {
    const published = challenge.steps.filter((s) => s.isPublished)
    if (published.length === 0) {
      errors.push('No step is published yet — participants would arrive to an empty challenge.')
    }
    const empty = published.filter((s) => s._count.contentBlocks === 0).length
    if (empty > 0) {
      errors.push(`${empty} published step${empty === 1 ? ' has' : 's have'} no content blocks.`)
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'PUBLISHED' as never },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${updated.slug}/builder`)
  return { success: true, errors: [] }
}

// ─── Unpublish Challenge ─────────────────────────────────────────────────────

/**
 * Take a published challenge back to draft.
 *
 * Publishing was a one-way door: DRAFT -> PUBLISHED -> COMPLETED, with no way
 * back. A creator who published with a mistake in it had no way to pull the
 * public page down and fix it.
 *
 * Reuses challenge.publish — deciding a challenge is not public is the same
 * call as deciding it is.
 */
export async function unpublishChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.publish')

  const challenge = await db.challenge.findUnique({
    where:  { id: challengeId },
    select: { status: true, workspaceId: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  // Scope the write to the workspace the permission was checked against, not
  // the bare row id.
  if (challenge.workspaceId !== ws.id) redirect(`/ws/${workspaceSlug}/challenges`)

  // A finished challenge stays finished; reopening it is closeChallenge's
  // inverse, not this one.
  if (challenge.status !== 'PUBLISHED' && challenge.status !== 'ACTIVE') {
    return { success: false, error: 'Only a published challenge can be unpublished.' }
  }

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'DRAFT' as never },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${updated.slug}/builder`)
  return { success: true }
}

// ─── Close Challenge ─────────────────────────────────────────────────────────

export async function closeChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.close')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'COMPLETED' as never },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${updated.slug}/builder`)
  return { success: true }
}

// ─── Delete Challenge ────────────────────────────────────────────────────────

/**
 * Take a challenge out of the way without destroying it.
 *
 * The menu on the challenge card has offered "Archive" since the card was
 * written and never had an action behind it. It exists now because it is the
 * answer to almost every reason someone reaches for Delete: a finished or
 * abandoned challenge they no longer want in the list. Deleting one takes its
 * participants' submissions with it.
 */
export async function archiveChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.close')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'ARCHIVED' as never },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${updated.slug}/settings`)
  return { success: true }
}

/**
 * Permanent. Every step, block, submission, feed post and enrolment goes with
 * it by cascade — including work that participants wrote and cannot get back.
 * The UI asks for the slug to be typed before calling this, and offers archive
 * first.
 */
export async function deleteChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.delete')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  await db.challenge.delete({ where: { id: challengeId } })
  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  redirect(`/ws/${workspaceSlug}/challenges`)
}

// ─── Step Actions ────────────────────────────────────────────────────────────

const STEP_TYPES = ['day', 'orientation', 'graduation', 'bonus'] as const

export async function addStepAction(challengeId: string, workspaceSlug: string, requestedType = 'day') {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  // Arrives from the browser; anything unknown was stored verbatim.
  const stepType: string = (STEP_TYPES as readonly string[]).includes(requestedType) ? requestedType : 'day'

  const maxOrder = await db.challengeStep.aggregate({
    where: { challengeId },
    _max:  { order: true },
  })
  const order = (maxOrder._max.order ?? -1) + 1

  const dayNum = stepType === 'day'
    ? (await db.challengeStep.count({ where: { challengeId, stepType: 'day' } })) + 1
    : null

  const step = await db.challengeStep.create({
    data: {
      challengeId,
      title:    stepType === 'day' ? `Day ${dayNum} — Untitled` :
                stepType === 'orientation' ? 'Welcome & Orientation' :
                stepType === 'graduation'  ? 'Graduation & Next Steps' : 'Bonus Step',
      order,
      stepType,
      isRequired:  stepType === 'day',
      isPublished: false,
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { id: step.id, order: step.order, title: step.title }
}

export async function updateStepAction(stepId: string, workspaceSlug: string, data: {
  title?:            string
  description?:      string
  estimatedMinutes?: number | null
  completionMethod?: string
  pointsXp?:         number | null
  availableAt?:      string | null
  dueAt?:            string | null
  isRequired?:       boolean
  isPublished?:      boolean
  unlockRule?:       string | null
  tomorrowTeaser?:   string | null
  dayImageUrl?:      string | null
}) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  await requireStepIn(ws.id, workspaceSlug, stepId)

  // The panel sends whatever was typed. A negative points value awarded
  // negative XP on completion, a decimal failed against the Int column, and a
  // cleared title left the day nameless everywhere participants see it.
  const wholeOrNull = (v: number | null | undefined) =>
    v === null || v === undefined || (Number.isInteger(v) && v >= 0 && v <= 100_000)
  if (!wholeOrNull(data.estimatedMinutes) || !wholeOrNull(data.pointsXp)) {
    return { error: 'Minutes and points must be whole numbers, 0 or more.' }
  }
  if (data.title !== undefined && !data.title.trim()) {
    return { error: 'A day needs a title.' }
  }

  const step = await db.challengeStep.update({
    where: { id: stepId },
    data: {
      ...(data.title            !== undefined && { title:            data.title.trim() }),
      ...(data.description      !== undefined && { description:      data.description }),
      ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
      ...(data.completionMethod !== undefined && { completionMethod: data.completionMethod }),
      ...(data.pointsXp         !== undefined && { pointsXp:         data.pointsXp }),
      ...(data.availableAt      !== undefined && { availableAt: data.availableAt ? new Date(data.availableAt) : null }),
      ...(data.dueAt            !== undefined && { dueAt:       data.dueAt       ? new Date(data.dueAt)       : null }),
      ...(data.isRequired       !== undefined && { isRequired:   data.isRequired }),
      ...(data.isPublished      !== undefined && { isPublished:  data.isPublished }),
      // Added with the builder redesign and missing from here until
      // 2026-09-30, so both controls in the settings panel wrote to nothing
      // and reverted on reload. Same failure as the block `required` flag:
      // an action that accepts a field and then does not list it.
      ...(data.unlockRule       !== undefined && { unlockRule:     data.unlockRule }),
      ...(data.tomorrowTeaser   !== undefined && { tomorrowTeaser: data.tomorrowTeaser }),
      ...(data.dayImageUrl      !== undefined && { dayImageUrl:    data.dayImageUrl }),
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { id: step.id }
}

export async function deleteStepAction(stepId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  const step = await requireStepIn(ws.id, workspaceSlug, stepId)

  // Close the gap the deleted step leaves. `order` is both the day number in
  // the participant URL (/day/<order + 1>) and the day offset the unlock
  // schedule counts from, so a hole made every later step open a day late
  // and broke the "next day" links.
  await db.$transaction(async (tx) => {
    await tx.challengeStep.delete({ where: { id: stepId } })
    const remaining = await tx.challengeStep.findMany({
      where:   { challengeId: step.challengeId },
      orderBy: { order: 'asc' },
      select:  { id: true, order: true },
    })
    for (const [index, s] of remaining.entries()) {
      if (s.order !== index) {
        await tx.challengeStep.update({ where: { id: s.id }, data: { order: index } })
      }
    }
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { success: true }
}

export async function reorderStepsAction(challengeId: string, workspaceSlug: string, stepIds: string[]) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  await requireChallengeIn(ws.id, workspaceSlug, challengeId)

  // Scoping the challenge is not enough here: the array is a second set of
  // client-supplied ids. `updateMany` with the challenge in the filter means a
  // foreign id simply matches nothing instead of being reordered.
  await Promise.all(
    stepIds.map((id, index) =>
      db.challengeStep.updateMany({ where: { id, challengeId }, data: { order: index } })
    )
  )

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { success: true }
}

// ─── Block Actions ───────────────────────────────────────────────────────────

export interface BlockData {
  id?:      string   // existing block id (for update) or undefined (for create)
  type:     string   // lowercase block type e.g. 'heading', 'video'
  order:    number
  data:     Record<string, unknown>
  required: boolean
  points?:  number
}

const BLOCK_TYPE_MAP: Record<string, string> = {
  heading:          'HEADING',
  text_response:    'TEXT_RESPONSE',
  file_upload:      'FILE_UPLOAD',
  video:            'VIDEO',
  image:            'IMAGE',
  download:         'DOWNLOAD',
  checklist:        'CHECKLIST',
  assignment:       'ASSIGNMENT',
  reflection:       'REFLECTION',
  discussion_prompt: 'DISCUSSION_PROMPT',
  live_session:      'LIVE_SESSION',
  offer_cta:         'OFFER_CTA',
}

export async function saveBlocksAction(
  stepId: string, workspaceSlug: string, blocks: BlockData[]
): Promise<{ success: true; count: number } | { success: false; count: 0; error: string }> {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')
  await requireStepIn(ws.id, workspaceSlug, stepId)

  // Every type is checked before anything is touched. An unknown one used to
  // reach createMany *after* deleteMany had already run, so one bad block
  // wiped the whole step.
  const unknown = blocks.find((b) => !BLOCK_TYPE_MAP[b.type])
  if (unknown) return { success: false, count: 0, error: `Unknown block type "${unknown.type}".` }

  // Delete all existing blocks for this step and re-create in order — simpler
  // than diffing, and the order is always consistent. One transaction, so a
  // failure part-way leaves the step exactly as it was.
  await db.$transaction(async (tx) => {
    await tx.contentBlock.deleteMany({ where: { stepId } })

    if (blocks.length > 0) {
      await tx.contentBlock.createMany({
        // `required` and `points` fold into `data` because `content_blocks` has
        // no column for either. Until 2026-09-29 `required` was accepted here
        // and then dropped on the floor — the toggle in the editor had never
        // once persisted, and a block marked required came back optional.
        data: blocks.map((b, i) => ({
          stepId,
          type:  BLOCK_TYPE_MAP[b.type] as never,
          order: i,
          data:  { ...b.data, required: b.required, points: b.points ?? 0 } as never,
        })),
      })
    }
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { success: true, count: blocks.length }
}
