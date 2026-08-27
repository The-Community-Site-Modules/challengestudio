// Route: /ws/[workspaceSlug]/participants
//
// Everyone enrolled in any challenge in this workspace. The sidebar has linked
// here since the sidebar existed; the route did not, so it answered with a 404.

import Link from 'next/link'
import { Users, Search } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'
import { approveParticipantAction, rejectParticipantAction } from './actions'
import { ApprovalActions } from './_components/approval-actions'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export const metadata = { title: 'Participants — Challenge Studio' }

/** Status pill styling. PENDING is amber: it is a queue, not a state of rest. */
const STATUS: Record<string, string> = {
  PENDING:    'bg-amber-50 text-amber-700 ring-amber-100',
  REGISTERED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ACTIVE:     'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED:  'bg-indigo-50 text-indigo-700 ring-indigo-100',
  DROPPED:    'bg-slate-100 text-slate-500 ring-slate-200',
}

function initialsOf(name: string | null, email: string) {
  return (name?.trim() || email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default async function ParticipantsPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const participants = await db.participant.findMany({
    where: { challenge: { workspaceId: workspace.id } },
    select: {
      id: true, status: true, registeredAt: true,
      profile:   { select: { fullName: true, email: true, avatarUrl: true } },
      challenge: { select: { title: true, slug: true } },
      _count:    { select: { submissions: true } },
    },
    orderBy: [{ status: 'asc' }, { registeredAt: 'desc' }],
    take: 200,
  })

  const awaitingApproval = participants.filter((p) => p.status === 'PENDING').length

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Participants"
            description="Everyone enrolled in a challenge in this workspace."
          />

          {awaitingApproval > 0 && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {awaitingApproval} {awaitingApproval === 1 ? 'person is' : 'people are'} waiting
              on you. Until you decide, they cannot open the challenge.
            </p>
          )}

          {participants.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Users className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                No participants yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                People appear here once they register for one of your challenges.
                Publish a challenge to open registration.
              </p>
              <Link
                href={`/ws/${workspaceSlug}/challenges`}
                className="mt-6 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Go to challenges
              </Link>
            </div>
          ) : (
            <div className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-[13px] text-slate-500">
                <Search className="h-3.5 w-3.5" />
                Showing {participants.length}
                {participants.length === 200 && ' (most recent)'}
              </div>

              <ul className="divide-y divide-slate-100">
                {participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {p.profile.avatarUrl && (
                        <AvatarImage src={p.profile.avatarUrl} alt="" />
                      )}
                      <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                        {initialsOf(p.profile.fullName, p.profile.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {p.profile.fullName?.trim() || p.profile.email}
                      </p>
                      <p className="truncate text-[13px] text-slate-500">{p.profile.email}</p>
                    </div>

                    <Link
                      href={`/ws/${workspaceSlug}/challenges/${p.challenge.slug}/overview`}
                      className="min-w-0 truncate text-[13px] text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline sm:w-48"
                    >
                      {p.challenge.title}
                    </Link>

                    <span className="text-[13px] tabular-nums text-slate-500 sm:w-24">
                      {p._count.submissions} submitted
                    </span>

                    {p.status === 'PENDING' ? (
                      <ApprovalActions
                        participantId={p.id}
                        workspaceSlug={workspaceSlug}
                        approveAction={approveParticipantAction}
                        rejectAction={rejectParticipantAction}
                      />
                    ) : (
                      <span
                        className={cn(
                          'inline-flex w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1',
                          STATUS[p.status as string] ?? STATUS.REGISTERED
                        )}
                      >
                        {String(p.status).toLowerCase()}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
