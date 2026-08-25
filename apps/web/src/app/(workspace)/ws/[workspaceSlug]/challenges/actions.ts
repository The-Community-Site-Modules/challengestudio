'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardData {
  // Step 1 — Foundation
  title:            string
  slug:             string
  description:      string
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
    .slice(0, 60)
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
  return map[mode] ?? 'SELF_PACED'
}

async function resolveWorkspace(workspaceSlug: string) {
  const ws = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true, slug: true },
  })
  if (!ws) redirect('/dashboard')
  return ws
}

// ─── Create Challenge (from wizard) ──────────────────────────────────────────

export async function createChallengeAction(workspaceSlug: string, data: WizardData) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.create')

  let slug = data.slug ? slugify(data.slug) : slugify(data.title)
  const existing = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: ws.id, slug } },
  })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const challenge = await db.challenge.create({
    data: {
      workspaceId:         ws.id,
      slug,
      title:               data.title,
      description:         data.description || null,
      promise:             data.promise     || null,
      outcome:             data.outcome     || null,
      startingPoint:       data.startingPoint     || null,
      successDefinition:   data.successDefinition || null,
      mode:                modeToEnum(data.mode) as never,
      status:              'DRAFT' as never,
      timezone:            data.timezone || null,
      startsAt:            data.startsAt ? new Date(data.startsAt) : null,
      endsAt:              data.endsAt   ? new Date(data.endsAt)   : null,
      registrationOpensAt:  data.registrationOpensAt  ? new Date(data.registrationOpensAt)  : null,
      registrationClosesAt: data.registrationClosesAt ? new Date(data.registrationClosesAt) : null,
      isPublic:            data.isPublic,
      maxParticipants:     data.maxParticipants || null,
      requiresApproval:    data.requiresApproval,
      settings:            (data.settings || {}) as never,
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  redirect(`/ws/${workspaceSlug}/challenges/${challenge.slug}/builder`)
}

// ─── Save Draft (partial wizard save) ────────────────────────────────────────

export async function saveDraftAction(workspaceSlug: string, data: Partial<WizardData>) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.create')

  let slug = data.slug ? slugify(data.slug) : slugify(data.title ?? `draft-${Date.now().toString(36)}`)
  const existing = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: ws.id, slug } },
  })
  if (existing && !data.slug) slug = `${slug}-${Date.now().toString(36)}`

  const challenge = await db.challenge.upsert({
    where: { workspaceId_slug: { workspaceId: ws.id, slug } },
    update: {
      title:             data.title            || undefined,
      description:       data.description      ?? undefined,
      promise:           data.promise          ?? undefined,
      outcome:           data.outcome          ?? undefined,
      startingPoint:     data.startingPoint    ?? undefined,
      successDefinition: data.successDefinition ?? undefined,
      settings:          (data.settings ?? undefined) as never,
      mode:              data.mode ? modeToEnum(data.mode) as never : undefined,
    },
    create: {
      workspaceId: ws.id,
      slug,
      title:       data.title || 'Untitled Challenge',
      status:      'DRAFT' as never,
      mode:        modeToEnum(data.mode ?? 'marketing') as never,
      settings:    data.settings || {},
    } as never,
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { slug: challenge.slug }
}

// ─── Update Challenge ────────────────────────────────────────────────────────

export async function updateChallengeAction(challengeId: string, workspaceSlug: string, data: Partial<WizardData>) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

  const challenge = await db.challenge.update({
    where: { id: challengeId },
    data: {
      ...(data.title            && { title: data.title }),
      ...(data.description      !== undefined && { description: data.description }),
      ...(data.promise          !== undefined && { promise: data.promise }),
      ...(data.outcome          !== undefined && { outcome: data.outcome }),
      ...(data.startingPoint    !== undefined && { startingPoint: data.startingPoint }),
      ...(data.successDefinition !== undefined && { successDefinition: data.successDefinition }),
      ...(data.mode             && { mode: modeToEnum(data.mode) as never }),
      ...(data.timezone         !== undefined && { timezone: data.timezone }),
      ...(data.startsAt         !== undefined && { startsAt: data.startsAt ? new Date(data.startsAt) : null }),
      ...(data.endsAt           !== undefined && { endsAt:   data.endsAt   ? new Date(data.endsAt)   : null }),
      ...(data.isPublic         !== undefined && { isPublic: data.isPublic }),
      ...(data.maxParticipants  !== undefined && { maxParticipants: data.maxParticipants }),
      ...(data.requiresApproval !== undefined && { requiresApproval: data.requiresApproval }),
      ...(data.settings         !== undefined && { settings: data.settings as never }),
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${challenge.slug}`)
  return { slug: challenge.slug }
}

// ─── Publish Challenge ───────────────────────────────────────────────────────

export async function publishChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.publish')

  // Validate before publish
  const challenge = await db.challenge.findUnique({
    where: { id: challengeId },
    include: { steps: { select: { id: true } } },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  const errors: string[] = []
  if (!challenge.title)               errors.push('Challenge title is required.')
  if (challenge.steps.length === 0)   errors.push('At least one step is required.')
  if (!challenge.startsAt)            errors.push('Start date is required.')

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

// ─── Close Challenge ─────────────────────────────────────────────────────────

export async function closeChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.close')

  const updated = await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'COMPLETED' as never },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${updated.slug}/builder`)
  return { success: true }
}

// ─── Delete Challenge ────────────────────────────────────────────────────────

export async function deleteChallengeAction(challengeId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.delete')

  await db.challenge.delete({ where: { id: challengeId } })
  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  redirect(`/ws/${workspaceSlug}/challenges`)
}

// ─── Step Actions ────────────────────────────────────────────────────────────

export async function addStepAction(challengeId: string, workspaceSlug: string, stepType = 'day') {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

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
}) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

  const step = await db.challengeStep.update({
    where: { id: stepId },
    data: {
      ...(data.title            !== undefined && { title:            data.title }),
      ...(data.description      !== undefined && { description:      data.description }),
      ...(data.estimatedMinutes !== undefined && { estimatedMinutes: data.estimatedMinutes }),
      ...(data.completionMethod !== undefined && { completionMethod: data.completionMethod }),
      ...(data.pointsXp         !== undefined && { pointsXp:         data.pointsXp }),
      ...(data.availableAt      !== undefined && { availableAt: data.availableAt ? new Date(data.availableAt) : null }),
      ...(data.dueAt            !== undefined && { dueAt:       data.dueAt       ? new Date(data.dueAt)       : null }),
      ...(data.isRequired       !== undefined && { isRequired:   data.isRequired }),
      ...(data.isPublished      !== undefined && { isPublished:  data.isPublished }),
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { id: step.id }
}

export async function deleteStepAction(stepId: string, workspaceSlug: string) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

  await db.challengeStep.delete({ where: { id: stepId } })
  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { success: true }
}

export async function reorderStepsAction(challengeId: string, workspaceSlug: string, stepIds: string[]) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

  await Promise.all(
    stepIds.map((id, index) =>
      db.challengeStep.update({ where: { id }, data: { order: index } })
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
}

export async function saveBlocksAction(stepId: string, workspaceSlug: string, blocks: BlockData[]) {
  const user = await requireUser()
  const ws   = await resolveWorkspace(workspaceSlug)
  await requirePermission(user.id, ws.id, 'challenge.edit')

  // Delete all existing blocks for this step and re-create in order
  // This is simpler than diffing and ensures order is always consistent
  await db.contentBlock.deleteMany({ where: { stepId } })

  if (blocks.length > 0) {
    await db.contentBlock.createMany({
      data: blocks.map((b, i) => ({
        stepId,
        type:  (BLOCK_TYPE_MAP[b.type] ?? b.type.toUpperCase()) as never,
        order: i,
        data:  b.data as never,
      })),
    })
  }

  revalidatePath(`/ws/${workspaceSlug}/challenges`)
  return { success: true, count: blocks.length }
}
