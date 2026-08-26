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

  return memberships.map(({ role, createdAt, workspace: w }) => {
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
