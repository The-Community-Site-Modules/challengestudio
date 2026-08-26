import { db } from '@/lib/db'

/**
 * Platform-wide reads for /admin.
 *
 * These deliberately cross every workspace, which is the one place in the app
 * that is allowed to — hence the platform-admin gate on the whole section.
 *
 * Several things the mock design showed have no source behind them and are not
 * invented here: a workspace has no plan or suspended state, a profile has no
 * platform role or last-seen timestamp, and nothing records feature flags or an
 * audit trail. Those columns are dropped rather than filled with plausible
 * numbers.
 */

const DAY = 86_400_000

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getPlatformTotals() {
  const monthAgo = new Date(Date.now() - 30 * DAY)

  const [workspaces, users, activeChallenges, totalChallenges, participants,
         newWorkspaces, newUsers, newParticipants] = await Promise.all([
    db.workspace.count(),
    db.profile.count(),
    db.challenge.count({ where: { status: { in: ['ACTIVE', 'PUBLISHED'] } } }),
    db.challenge.count(),
    db.participant.count(),
    db.workspace.count({ where: { createdAt: { gte: monthAgo } } }),
    db.profile.count({ where: { createdAt: { gte: monthAgo } } }),
    db.participant.count({ where: { registeredAt: { gte: monthAgo } } }),
  ])

  return {
    workspaces, users, activeChallenges, totalChallenges, participants,
    newWorkspaces, newUsers, newParticipants,
  }
}

/** Workspaces created per day for the last 7 days, empty days included. */
export async function getWorkspaceSignups() {
  const since = startOfDayUTC(new Date(Date.now() - 6 * DAY))

  const rows = await db.workspace.findMany({
    where:  { createdAt: { gte: since } },
    select: { createdAt: true },
  })

  const buckets = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    buckets.set(new Date(since.getTime() + i * DAY).toISOString().slice(0, 10), 0)
  }
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return [...buckets].map(([date, value]) => ({
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    value,
  }))
}

export interface WorkspaceRow {
  id: string
  name: string
  slug: string
  createdAt: Date
  ownerName: string
  challenges: number
  members: number
  participants: number
}

/**
 * Workspaces with their totals.
 *
 * Participants hang off challenges, so the count is summed rather than read
 * from a single `_count`. Fine at admin-tool scale with a `take`; a platform
 * with thousands of workspaces would want this as one aggregate query.
 */
export async function getWorkspaceRows(take?: number): Promise<WorkspaceRow[]> {
  const rows = await db.workspace.findMany({
    ...(take ? { take } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, slug: true, createdAt: true,
      owner: { select: { fullName: true, email: true } },
      _count: { select: { challenges: true, members: true } },
      challenges: { select: { _count: { select: { participants: true } } } },
    },
  })

  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    createdAt: w.createdAt,
    ownerName: w.owner.fullName ?? w.owner.email,
    challenges: w._count.challenges,
    members: w._count.members,
    participants: w.challenges.reduce((sum, c) => sum + c._count.participants, 0),
  }))
}

export interface PlatformEvent {
  kind: 'workspace' | 'challenge' | 'participant'
  text: string
  at: Date
}

/**
 * A recent-activity feed assembled from the rows themselves.
 *
 * There is no events table, so this is the closest honest thing: the newest
 * workspaces, challenges and registrations, merged and sorted. It cannot show
 * anything that is not a row — a bounce-rate spike or a storage warning has
 * nowhere to come from.
 */
export async function getRecentEvents(limit = 8): Promise<PlatformEvent[]> {
  const [workspaces, challenges, participants] = await Promise.all([
    db.workspace.findMany({
      take: limit, orderBy: { createdAt: 'desc' },
      select: { name: true, createdAt: true },
    }),
    db.challenge.findMany({
      take: limit, orderBy: { createdAt: 'desc' },
      select: { title: true, status: true, createdAt: true, workspace: { select: { name: true } } },
    }),
    // A wider window than the others: these get grouped per challenge, so the
    // count is only meaningful if more than `limit` rows are in play.
    db.participant.findMany({
      take: 200, orderBy: { registeredAt: 'desc' },
      select: { registeredAt: true, challenge: { select: { title: true } } },
    }),
  ])

  const events: PlatformEvent[] = [
    ...workspaces.map((w) => ({
      kind: 'workspace' as const,
      text: `New workspace — “${w.name}”`,
      at: w.createdAt,
    })),
    ...challenges.map((c) => ({
      kind: 'challenge' as const,
      text: `Challenge ${c.status === 'DRAFT' ? 'drafted' : c.status.toLowerCase()} — “${c.title}” in ${c.workspace.name}`,
      at: c.createdAt,
    })),
    ...groupRegistrations(participants),
  ]

  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit)
}

/**
 * Collapse registrations into one line per challenge.
 *
 * A bulk signup otherwise fills the whole feed with the same sentence repeated,
 * pushing everything else out. One line carrying the count says more in less
 * space and leaves room for the other kinds of event.
 */
function groupRegistrations(
  rows: Array<{ registeredAt: Date; challenge: { title: string } }>
): PlatformEvent[] {
  const byChallenge = new Map<string, { count: number; latest: Date }>()

  for (const r of rows) {
    const seen = byChallenge.get(r.challenge.title)
    if (seen) {
      seen.count += 1
      if (r.registeredAt > seen.latest) seen.latest = r.registeredAt
    } else {
      byChallenge.set(r.challenge.title, { count: 1, latest: r.registeredAt })
    }
  }

  return [...byChallenge].map(([title, { count, latest }]) => ({
    kind: 'participant' as const,
    text: count === 1
      ? `Someone registered for “${title}”`
      : `${count} registrations for “${title}”`,
    at: latest,
  }))
}

export interface ServiceStatus {
  name: string
  state: 'ok' | 'not-configured' | 'error'
  detail: string
}

/**
 * What the platform can actually tell you about itself.
 *
 * The database entry is a real round trip and a real number. The rest is not
 * uptime monitoring — nothing here pings a provider — it reports whether each
 * integration is configured at all, which is true, useful, and does not pretend
 * to be a latency graph.
 */
export async function getServiceStatus(): Promise<ServiceStatus[]> {
  let database: ServiceStatus
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    database = { name: 'Database', state: 'ok', detail: `${Date.now() - started}ms` }
  } catch (error) {
    database = {
      name: 'Database',
      state: 'error',
      detail: error instanceof Error ? error.message.slice(0, 60) : 'unreachable',
    }
  }

  const configured = (value: string | undefined): ServiceStatus['state'] =>
    value ? 'ok' : 'not-configured'

  return [
    database,
    {
      name: 'Authentication',
      state: configured(process.env.NEXT_PUBLIC_SUPABASE_URL),
      detail: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase' : 'not configured',
    },
    {
      name: 'Email delivery',
      state: configured(process.env.RESEND_API_KEY),
      detail: process.env.RESEND_API_KEY ? 'Resend' : 'no API key — invitations fall back to a copyable link',
    },
    {
      name: 'File storage',
      state: configured(process.env.R2_ACCESS_KEY_ID),
      detail: process.env.R2_ACCESS_KEY_ID ? 'Cloudflare R2' : 'not configured — uploads unavailable',
    },
    {
      name: 'Background jobs',
      state: configured(process.env.INNGEST_EVENT_KEY),
      detail: process.env.INNGEST_EVENT_KEY ? 'Inngest' : 'not configured — scheduled sends will not run',
    },
  ]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string
  name: string
  email: string
  createdAt: Date
  workspaces: number
  participations: number
  ownsWorkspace: boolean
}

export async function getUserRows(take = 100): Promise<{ rows: UserRow[]; total: number }> {
  const [total, rows] = await Promise.all([
    db.profile.count(),
    db.profile.findMany({
    take,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, fullName: true, createdAt: true,
      _count: { select: { workspaceMemberships: true, participations: true, ownedWorkspaces: true } },
    },
    }),
  ])

  return {
    total,
    rows: rows.map((p) => ({
      id: p.id,
      name: p.fullName ?? '—',
      email: p.email,
      createdAt: p.createdAt,
      workspaces: p._count.workspaceMemberships,
      participations: p._count.participations,
      ownsWorkspace: p._count.ownedWorkspaces > 0,
    })),
  }
}
