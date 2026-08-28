/**
 * CSV export of participants and progress (PRD §17.3).
 *
 * All three of §17.3's conditions meet here: the capability is checked before
 * anything is read, the export is written to the audit log, and the rows
 * carry counts and dates rather than submission content — private or not.
 */

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { participantExportRows, toCsv, writeExportAudit } from '@/lib/analytics/export'

interface Params {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { workspaceSlug, challengeSlug } = await params
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) return new NextResponse('Not found', { status: 404 })

  // Exporting is its own capability. Being able to read the dashboard is not
  // the same as being able to walk away with the participant list.
  if (!(await hasPermission(user.id, workspace.id, 'workspace.export'))) {
    return new NextResponse('Not allowed', { status: 403 })
  }

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, slug: true },
  })
  if (!challenge) return new NextResponse('Not found', { status: 404 })

  const rows = await participantExportRows(challenge.id)

  await writeExportAudit({
    workspaceId: workspace.id,
    actorId:     user.id,
    challengeId: challenge.id,
    rows:        rows.length,
  })

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${challenge.slug}-participants-${today}.csv"`,
      // A participant list should not sit in a shared cache.
      'Cache-Control': 'no-store',
    },
  })
}
