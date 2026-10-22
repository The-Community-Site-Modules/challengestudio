import { db } from '@/lib/db'

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: string
  challenges: number
  participants: number
  members: number
  /** Newest real signal in this workspace — see getWorkspaceSummaries. */
  lastActivity: Date
  joinedAt: Date
}

export interface PickerTotals {
  workspaces: number
  activeChallenges: number
  teamMembers: number
  participants: number
}

/**
 * The workspaces this person belongs to, with the numbers the picker shows.
 *
 * Nothing records a "last active" timestamp, so it is derived from the newest
 * thing that actually happened: the workspace row's own updatedAt, its most
 * recently touched challenge, and its most recent registration. That is real
 * activity rather than an invented visit log, and the UI labels it as such.
 */
export async function getWorkspaceSummaries(userId: string): Promise<WorkspaceSummary[]> {
  const memberships = await db.workspaceMember.findMany({
    where: { profileId: userId },
    select: {
      role: true,
      createdAt: true,
      workspace: {
        select: {
          id: true, name: true, slug: true, logoUrl: true, updatedAt: true,
          _count: { select: { challenges: true, members: true } },
          challenges: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
    },
  })

  if (memberships.length === 0) return []

  const ids = memberships.map((m) => m.workspace.id)

  // One aggregate rather than a query per workspace: participants hang off
  // challenges, so there is no relation Prisma can count directly from here.
  const rows = await db.$queryRaw<Array<{ workspace_id: string; total: bigint; last: Date | null }>>`
    SELECT c.workspace_id,
           COUNT(p.id)          AS total,
           MAX(p.registered_at) AS last
    FROM challenges c
    LEFT JOIN participants p ON p.challenge_id = c.id
    WHERE c.workspace_id = ANY(${ids})
    GROUP BY c.workspace_id
  `
  const byWorkspace = new Map(rows.map((r) => [r.workspace_id, r]))

  const summaries = memberships.map(({ role, createdAt, workspace: w }) => {
    const agg = byWorkspace.get(w.id)
    const candidates = [w.updatedAt, w.challenges[0]?.updatedAt, agg?.last ?? undefined]
      .filter((d): d is Date => d instanceof Date)

    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      logoUrl: w.logoUrl,
      role,
      challenges: w._count.challenges,
      members: w._count.members,
      participants: Number(agg?.total ?? 0),
      lastActivity: candidates.reduce((a, b) => (b > a ? b : a), candidates[0] ?? w.updatedAt),
      joinedAt: createdAt,
    }
  })

  // Most recently active first.
  //
  // The membership query has no ORDER BY, and could not usefully have one:
  // `lastActivity` is the latest of three dates assembled above, not a column.
  // Sorting it here is what makes the first entry mean something — the sidebar
  // names it as the workspace you are working in, and the cards default to the
  // same order, so one page no longer gives two answers to "which is first".
  return summaries.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
}

/**
 * Headline numbers across everything this person can see.
 *
 * Team members counts distinct people, not memberships — someone in three of
 * your workspaces is one colleague, and summing the per-workspace counts would
 * report them three times.
 */
export async function getPickerTotals(
  userId: string,
  summaries: WorkspaceSummary[]
): Promise<PickerTotals> {
  const ids = summaries.map((s) => s.id)

  if (ids.length === 0) {
    return { workspaces: 0, activeChallenges: 0, teamMembers: 0, participants: 0 }
  }

  const [activeChallenges, distinctMembers] = await Promise.all([
    db.challenge.count({
      where: { workspaceId: { in: ids }, status: { in: ['ACTIVE', 'PUBLISHED'] } },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: { in: ids } },
      select: { profileId: true },
      distinct: ['profileId'],
    }),
  ])

  return {
    workspaces: summaries.length,
    activeChallenges,
    // Everyone you share a workspace with, yourself included.
    teamMembers: distinctMembers.length,
    participants: summaries.reduce((sum, s) => sum + s.participants, 0),
  }
}

// ── The agency-wide dashboard ──────────────────────────────────────────────
//
// Everything below answers "how is the whole account doing", across every
// workspace this person belongs to — as against the per-workspace dashboard
// at /ws/<slug>, which answers the same questions one workspace at a time.
//
// Every query here is scoped by the workspace ids the caller already resolved
// from `workspace_members`. That scoping is the only thing standing between
// one agency's numbers and another's: Prisma connects as the table owner, so
// row-level security does not apply to anything the app does.

export interface AgencyChallenge {
  id: string
  slug: string
  title: string
  status: string
  startsAt: Date | null
  participants: number
  steps: number
  workspaceName: string
  workspaceSlug: string
}

export interface AgencyEvent {
  id: string
  kind: 'registration' | 'submission'
  who: string
  what: string
  workspaceName: string
  at: Date
}

export interface AgencyOverview {
  /** Published or active challenges, newest first, across every workspace. */
  challenges: AgencyChallenge[]
  /** Submissions nobody has reviewed yet — the one thing that needs a person. */
  pendingReviews: number
  /** Participants waiting to be let in, where a challenge asks for approval. */
  pendingApprovals: number
  /** Registrations in the last 30 days, by day, for the sparkline. */
  registrations: { date: string; value: number }[]
  /** The newest real events, mixed across workspaces. */
  events: AgencyEvent[]
}

export async function getAgencyOverview(
  summaries: WorkspaceSummary[],
  now = new Date()
): Promise<AgencyOverview> {
  const ids = summaries.map((s) => s.id)
  if (ids.length === 0) {
    return { challenges: [], pendingReviews: 0, pendingApprovals: 0, registrations: [], events: [] }
  }

  const nameByWorkspace = new Map(summaries.map((s) => [s.id, s.name]))
  const slugByWorkspace = new Map(summaries.map((s) => [s.id, s.slug]))
  const since = new Date(now.getTime() - 30 * 86_400_000)

  const [rows, pendingReviews, pendingApprovals, registrations, submissions] = await Promise.all([
    db.challenge.findMany({
      where: { workspaceId: { in: ids }, status: { in: ['ACTIVE', 'PUBLISHED'] } },
      orderBy: { startsAt: 'desc' },
      take: 8,
      select: {
        id: true, slug: true, title: true, status: true, startsAt: true, workspaceId: true,
        _count: { select: { participants: true, steps: true } },
      },
    }),
    db.submission.count({
      where: { reviewedAt: null, participant: { challenge: { workspaceId: { in: ids } } } },
    }),
    db.participant.count({
      where: { status: 'PENDING', challenge: { workspaceId: { in: ids } } },
    }),
    db.participant.findMany({
      where: { challenge: { workspaceId: { in: ids } }, registeredAt: { gte: since } },
      select: {
        id: true, registeredAt: true,
        profile: { select: { fullName: true, email: true } },
        challenge: { select: { title: true, workspaceId: true } },
      },
      orderBy: { registeredAt: 'desc' },
    }),
    db.submission.findMany({
      where: { participant: { challenge: { workspaceId: { in: ids } } } },
      select: {
        id: true, submittedAt: true,
        participant: {
          select: {
            profile: { select: { fullName: true, email: true } },
            challenge: { select: { title: true, workspaceId: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    }),
  ])

  const challenges: AgencyChallenge[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    status: c.status,
    startsAt: c.startsAt,
    participants: c._count.participants,
    steps: c._count.steps,
    workspaceName: nameByWorkspace.get(c.workspaceId) ?? 'Workspace',
    workspaceSlug: slugByWorkspace.get(c.workspaceId) ?? '',
  }))

  // One bucket per day for the last 30, so a quiet day is a gap in the line
  // rather than a missing point that the chart would smooth over.
  const buckets = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const r of registrations) {
    const key = r.registeredAt.toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const named = (p: { fullName: string | null; email: string } | null) =>
    p?.fullName?.trim() || p?.email?.split('@')[0] || 'Someone'

  const events: AgencyEvent[] = [
    ...registrations.slice(0, 10).map((r) => ({
      id: `reg-${r.id}`,
      kind: 'registration' as const,
      who: named(r.profile),
      what: `joined ${r.challenge.title}`,
      workspaceName: nameByWorkspace.get(r.challenge.workspaceId) ?? 'Workspace',
      at: r.registeredAt,
    })),
    ...submissions.map((s) => ({
      id: `sub-${s.id}`,
      kind: 'submission' as const,
      who: named(s.participant.profile),
      what: `submitted work in ${s.participant.challenge.title}`,
      workspaceName: nameByWorkspace.get(s.participant.challenge.workspaceId) ?? 'Workspace',
      at: s.submittedAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)

  return {
    challenges,
    pendingReviews,
    pendingApprovals,
    registrations: [...buckets].map(([date, value]) => ({ date, value })),
    events,
  }
}

// ── Agency-wide lists ──────────────────────────────────────────────────────
//
// The sidebar at this level offers Content, Participants and Team. Those words
// mean something different here than inside a workspace: every workspace at
// once, with the workspace named on each row. A row that did not say which
// workspace it belonged to would be worse than no row at all.

export interface AgencyContentStep {
  id: string
  title: string
  order: number
  isPublished: boolean
  blocks: number
}

export interface AgencyContentChallenge {
  id: string
  slug: string
  title: string
  status: string
  workspaceName: string
  workspaceSlug: string
  steps: AgencyContentStep[]
}

/** Every challenge's content, across every workspace, newest first. */
export async function getAgencyContent(
  summaries: WorkspaceSummary[]
): Promise<AgencyContentChallenge[]> {
  const ids = summaries.map((s) => s.id)
  if (ids.length === 0) return []

  const byId = new Map(summaries.map((s) => [s.id, s]))

  const challenges = await db.challenge.findMany({
    where: { workspaceId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, slug: true, title: true, status: true, workspaceId: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true, isPublished: true,
          _count: { select: { contentBlocks: true } },
        },
      },
    },
  })

  return challenges.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    status: c.status,
    workspaceName: byId.get(c.workspaceId)?.name ?? 'Workspace',
    workspaceSlug: byId.get(c.workspaceId)?.slug ?? '',
    steps: c.steps.map((s) => ({
      id: s.id,
      title: s.title,
      order: s.order,
      isPublished: s.isPublished,
      blocks: s._count.contentBlocks,
    })),
  }))
}

export interface AgencyParticipantEnrolment {
  challengeTitle: string
  workspaceName: string
  status: string
  registeredAt: Date
}

export interface AgencyParticipant {
  profileId: string
  name: string
  email: string
  avatarUrl: string | null
  /** Distinct workspace names this person appears in, in enrolment order. */
  workspaces: string[]
  enrolments: AgencyParticipantEnrolment[]
  submissions: number
  firstSeen: Date
}

/**
 * One row per person, not per enrolment.
 *
 * Somebody who joined three of your challenges is one participant who shows up
 * three times, and a list that repeated them would make the agency look busier
 * than it is. The enrolments are kept so each row can say where they are.
 */
export async function getAgencyParticipants(
  summaries: WorkspaceSummary[]
): Promise<AgencyParticipant[]> {
  const ids = summaries.map((s) => s.id)
  if (ids.length === 0) return []

  const byId = new Map(summaries.map((s) => [s.id, s.name]))

  const rows = await db.participant.findMany({
    where: { challenge: { workspaceId: { in: ids } } },
    orderBy: { registeredAt: 'desc' },
    select: {
      id: true, status: true, registeredAt: true, profileId: true,
      profile:   { select: { fullName: true, email: true, avatarUrl: true } },
      challenge: { select: { title: true, workspaceId: true } },
      _count:    { select: { submissions: true } },
    },
  })

  const people = new Map<string, AgencyParticipant>()

  for (const r of rows) {
    const workspaceName = byId.get(r.challenge.workspaceId) ?? 'Workspace'
    const existing = people.get(r.profileId)

    const enrolment: AgencyParticipantEnrolment = {
      challengeTitle: r.challenge.title,
      workspaceName,
      status: r.status,
      registeredAt: r.registeredAt,
    }

    if (existing) {
      existing.enrolments.push(enrolment)
      existing.submissions += r._count.submissions
      if (!existing.workspaces.includes(workspaceName)) existing.workspaces.push(workspaceName)
      if (r.registeredAt < existing.firstSeen) existing.firstSeen = r.registeredAt
      continue
    }

    people.set(r.profileId, {
      profileId: r.profileId,
      name: r.profile?.fullName?.trim() || r.profile?.email?.split('@')[0] || 'Someone',
      email: r.profile?.email ?? '',
      avatarUrl: r.profile?.avatarUrl ?? null,
      workspaces: [workspaceName],
      enrolments: [enrolment],
      submissions: r._count.submissions,
      firstSeen: r.registeredAt,
    })
  }

  return [...people.values()]
}

export interface AgencyTeamMember {
  profileId: string
  name: string
  email: string
  avatarUrl: string | null
  /** Each workspace they belong to and the role they hold there. */
  memberships: { workspaceName: string; workspaceSlug: string; role: string }[]
  joinedAt: Date
}

/**
 * Everyone who shares a workspace with this person — counted once.
 *
 * The same reasoning as participants: a colleague in three workspaces is one
 * colleague. `getPickerTotals` already counts distinct people for the tile on
 * the dashboard, and this list has to agree with that number.
 */
export async function getAgencyTeam(
  summaries: WorkspaceSummary[]
): Promise<AgencyTeamMember[]> {
  const ids = summaries.map((s) => s.id)
  if (ids.length === 0) return []

  const byId = new Map(summaries.map((s) => [s.id, s]))

  const rows = await db.workspaceMember.findMany({
    where: { workspaceId: { in: ids } },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true, createdAt: true, workspaceId: true, profileId: true,
      profile: { select: { fullName: true, email: true, avatarUrl: true } },
    },
  })

  const people = new Map<string, AgencyTeamMember>()

  for (const r of rows) {
    const ws = byId.get(r.workspaceId)
    const membership = {
      workspaceName: ws?.name ?? 'Workspace',
      workspaceSlug: ws?.slug ?? '',
      role: r.role,
    }

    const existing = people.get(r.profileId)
    if (existing) {
      existing.memberships.push(membership)
      if (r.createdAt < existing.joinedAt) existing.joinedAt = r.createdAt
      continue
    }

    people.set(r.profileId, {
      profileId: r.profileId,
      name: r.profile?.fullName?.trim() || r.profile?.email?.split('@')[0] || 'Someone',
      email: r.profile?.email ?? '',
      avatarUrl: r.profile?.avatarUrl ?? null,
      memberships: [membership],
      joinedAt: r.createdAt,
    })
  }

  return [...people.values()]
}
