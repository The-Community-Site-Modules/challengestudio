// Route: .../challenges/[challengeSlug]/live-sessions — PRD §16.
//
// Was placeholder text. Creators schedule sessions here with a title, time,
// host, join link and replay link; participants see them in the hub.

import { notFound } from 'next/navigation'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { dateToZonedLocal } from '@/lib/time/zoned'
import { SessionsClient, type SessionRow } from './_components/sessions-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Live sessions — Challenge Studio' }


export default async function LiveSessionsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true, timezone: true },
  })
  if (!challenge) notFound()

  const rows = await db.liveSession.findMany({
    where:   { challengeId: challenge.id },
    orderBy: { startsAt: 'asc' },
  })

  const sessions: SessionRow[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    // On the challenge's wall clock — the same zone the action reads it back
    // in. This used the server's clock (UTC) both ways, so the time a creator
    // typed was silently taken as UTC.
    startsAt: dateToZonedLocal(s.startsAt, challenge.timezone),
    durationMinutes: s.durationMinutes?.toString() ?? '',
    hostName: s.hostName ?? '',
    joinUrl: s.joinUrl ?? '',
    replayUrl: s.replayUrl ?? '',
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Live sessions"
            description={`Calls attached to ${challenge.title}. Participants see them in their hub. Times are in ${challenge.timezone ?? 'UTC'}.`}
          />
          <SessionsClient
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            sessions={sessions}
          />
        </div>
      </main>
    </div>
  )
}
