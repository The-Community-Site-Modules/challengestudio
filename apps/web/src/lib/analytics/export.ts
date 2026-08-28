/**
 * Participant and progress export (PRD §17.3, milestone 10).
 *
 * §17.3 sets three conditions, and each is met somewhere specific:
 *
 *   "permission-checked"  the route asks for workspace.export before calling
 *                         anything here.
 *   "logged"              writeExportAudit records who took what.
 *   "designed to avoid    the row shape below carries counts and dates and no
 *    unintentionally      submission bodies at all. Private content is not
 *    exposing private     filtered out downstream — it is never gathered, so
 *    submission content"  it cannot leak through a column nobody thought about.
 */

import { db } from '@/lib/db'

export interface ParticipantExportRow {
  name: string
  email: string
  status: string
  registeredAt: string
  lastActivityAt: string
  stepsCompleted: number
  stepsTotal: number
  /** How many of their submissions were marked private — a count, not content. */
  privateSubmissions: number
  points: number
  badges: number
  posts: number
  comments: number
}

/** RFC 4180: quote anything containing a comma, quote or newline. */
function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: ParticipantExportRow[]): string {
  const headers: (keyof ParticipantExportRow)[] = [
    'name', 'email', 'status', 'registeredAt', 'lastActivityAt',
    'stepsCompleted', 'stepsTotal', 'privateSubmissions',
    'points', 'badges', 'posts', 'comments',
  ]
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => csvCell(row[h])).join(','))
  }
  // CRLF, because spreadsheet software is the destination and it is fussier.
  return lines.join('\r\n')
}

/**
 * Gather one challenge's participants.
 *
 * Note what is not selected: `data` on submissions. The export cannot expose
 * what it never reads, which is a stronger guarantee than remembering to strip
 * it later.
 */
export async function participantExportRows(challengeId: string): Promise<ParticipantExportRow[]> {
  const [participants, stepCount] = await Promise.all([
    db.participant.findMany({
      where:   { challengeId },
      orderBy: { registeredAt: 'asc' },
      select: {
        id: true, status: true, registeredAt: true,
        profile: { select: { fullName: true, email: true } },
        submissions: { select: { submittedAt: true, isPrivate: true } },
        _count: { select: { posts: true, comments: true, badgeAwards: true } },
      },
    }),
    db.challengeStep.count({ where: { challengeId, isRequired: true } }),
  ])

  const points = await db.pointsEvent.groupBy({
    by: ['participantId'],
    where:  { challengeId },
    _sum:   { points: true },
  })
  const pointsBy = new Map(points.map(p => [p.participantId, p._sum.points ?? 0]))

  return participants.map((p) => {
    const last = p.submissions.reduce<Date | null>(
      (newest, s) => (!newest || s.submittedAt > newest ? s.submittedAt : newest), null
    )
    return {
      name: p.profile.fullName?.trim() || '',
      email: p.profile.email,
      status: String(p.status).toLowerCase(),
      registeredAt: p.registeredAt.toISOString(),
      lastActivityAt: last?.toISOString() ?? '',
      stepsCompleted: p.submissions.length,
      stepsTotal: stepCount,
      privateSubmissions: p.submissions.filter(s => s.isPrivate).length,
      points: pointsBy.get(p.id) ?? 0,
      badges: p._count.badgeAwards,
      posts: p._count.posts,
      comments: p._count.comments,
    }
  })
}

/** Record that an export happened. §17.3 asks for exports to be logged. */
export async function writeExportAudit(input: {
  workspaceId: string
  actorId: string
  challengeId: string
  rows: number
}) {
  await db.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorId:     input.actorId,
      action:      'export.participants',
      subjectId:   input.challengeId,
      detail:      { rows: input.rows, format: 'csv' },
    },
  })
}
