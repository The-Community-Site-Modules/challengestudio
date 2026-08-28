// Route: .../challenges/[challengeSlug]/participants
//
// Everyone in one challenge, and the way into each person's detail page
// (PRD §17.2). Was placeholder text. The workspace-level list covers every
// challenge at once; this one is scoped, which is what a creator looking at a
// single challenge actually wants.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Participants — Challenge Studio' }

const STATUS: Record<string, string> = {
  PENDING:    'bg-amber-50 text-amber-700 ring-amber-100',
  REGISTERED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ACTIVE:     'bg-emerald-50 text-emerald-700 ring-emerald-100',
  COMPLETED:  'bg-indigo-50 text-indigo-700 ring-indigo-100',
  DROPPED:    'bg-slate-100 text-slate-500 ring-slate-200',
}

export default async function ChallengeParticipantsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  if (!(await hasPermission(user.id, workspace.id, 'participant.view'))) {
    redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)
  }

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      id: true, title: true,
      _count: { select: { steps: true } },
    },
  })
  if (!challenge) notFound()

  const participants = await db.participant.findMany({
    where:   { challengeId: challenge.id },
    orderBy: [{ status: 'asc' }, { registeredAt: 'desc' }],
    take: 200,
    select: {
      id: true, status: true, registeredAt: true,
      profile: { select: { fullName: true, email: true, avatarUrl: true } },
      submissions: { select: { submittedAt: true } },
    },
  })

  const requiredSteps = await db.challengeStep.count({
    where: { challengeId: challenge.id, isRequired: true },
  })
  const total = requiredSteps || challenge._count.steps

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
            title="Participants"
            description={`Everyone taking part in ${challenge.title}.`}
          />

          {participants.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Users className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                Nobody yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                People appear here once they register. Publishing the challenge
                opens registration.
              </p>
            </div>
          ) : (
            <ul className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {participants.map((p) => {
                const name = p.profile.fullName?.trim() || p.profile.email
                const last = p.submissions.reduce<Date | null>(
                  (newest, s) => (!newest || s.submittedAt > newest ? s.submittedAt : newest), null
                )
                return (
                  <li key={p.id} className="border-b border-slate-100 last:border-b-0">
                    <Link
                      href={`/ws/${workspaceSlug}/challenges/${challengeSlug}/participants/${p.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {p.profile.avatarUrl && <AvatarImage src={p.profile.avatarUrl} alt="" />}
                        <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                          {name.split(/[\s@._-]+/).filter(Boolean).map(x => x[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
                        <span className="block truncate text-[13px] text-slate-500">{p.profile.email}</span>
                      </span>

                      <span className="hidden w-32 shrink-0 text-right text-[13px] text-slate-500 sm:block">
                        {last
                          ? `active ${last.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                          : 'not started'}
                      </span>

                      <span className="w-20 shrink-0 text-right text-[13px] tabular-nums text-slate-600">
                        {p.submissions.length} of {total}
                      </span>

                      <span className={cn(
                        'w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium uppercase tracking-wide ring-1',
                        STATUS[p.status as string] ?? STATUS.REGISTERED
                      )}>
                        {String(p.status).toLowerCase()}
                      </span>

                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
