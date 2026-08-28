// Route: .../challenges/[challengeSlug]/participants/[participantId]
//
// Participant-level reporting (PRD §17.2): "enrollment status, last activity,
// progress, submissions, points, streak, badges, and communication history.
// Sensitive private reflections must be clearly identified and
// permission-limited."
//
// Every one of those is here, and the last clause is enforced the same way the
// review page enforces it: a private answer is withheld on the server, not
// rendered and hidden. It is marked so a facilitator knows it exists.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Lock, Flame, Star, Trophy, Mail, CheckCircle2,
} from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { badgeByKey } from '@/lib/gamification'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string; participantId: string }>
}

export const metadata = { title: 'Participant — Challenge Studio' }

const when = (d: Date) =>
  d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Consecutive days with a submission, counting back from today. */
function streakFrom(dates: Date[]): number {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const days = new Set(dates.map(d => key(new Date(d))))
  let streak = 0
  const cursor = new Date()
  while (days.has(key(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  return streak
}

function readable(data: unknown): string {
  if (typeof data !== 'object' || data === null) return ''
  const d = data as Record<string, unknown>
  if (typeof d.text === 'string') return d.text
  if (typeof d.answer === 'string') return d.answer
  return Object.entries(d)
    .filter(([k, v]) => typeof v === 'string' && k !== 'isPrivate')
    .map(([, v]) => v as string)
    .join('\n\n')
}

export default async function ParticipantDetailPage({ params }: Props) {
  const { workspaceSlug, challengeSlug, participantId } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  const [canView, canSeePrivate] = await Promise.all([
    hasPermission(user.id, workspace.id, 'participant.view'),
    hasPermission(user.id, workspace.id, 'submission.view_private'),
  ])
  if (!canView) redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      id: true, title: true,
      steps: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true, isRequired: true } },
    },
  })
  if (!challenge) notFound()

  const participant = await db.participant.findUnique({
    where:  { id: participantId },
    select: {
      id: true, challengeId: true, status: true, registeredAt: true, completedAt: true,
      profile: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true, stepId: true, data: true, isPrivate: true, submittedAt: true,
          feedback: true, reviewedAt: true,
        },
      },
      badgeAwards: { orderBy: { awardedAt: 'asc' }, select: { badgeKey: true, awardedAt: true } },
      _count: { select: { posts: true, comments: true } },
    },
  })
  // The id comes from the URL, so it has to belong to this challenge.
  if (!participant || participant.challengeId !== challenge.id) notFound()

  const [points, deliveries] = await Promise.all([
    db.pointsEvent.aggregate({
      where: { participantId: participant.id },
      _sum:  { points: true },
    }),
    db.messageDelivery.findMany({
      where:   { participantId: participant.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, trigger: true, status: true, createdAt: true },
    }),
  ])

  const stepTitle = new Map(challenge.steps.map(s => [s.id, s]))
  const requiredTotal = challenge.steps.filter(s => s.isRequired).length || challenge.steps.length
  const streak = streakFrom(participant.submissions.map(s => s.submittedAt))
  const lastActivity = participant.submissions[0]?.submittedAt ?? null
  const name = participant.profile.fullName?.trim() || participant.profile.email

  const facts = [
    { Icon: CheckCircle2, label: 'Progress', value: `${participant.submissions.length} of ${requiredTotal}` },
    { Icon: Star,         label: 'Points',   value: (points._sum.points ?? 0).toLocaleString() },
    { Icon: Flame,        label: 'Streak',   value: `${streak} day${streak === 1 ? '' : 's'}` },
    { Icon: Trophy,       label: 'Badges',   value: String(participant.badgeAwards.length) },
  ]

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

          <Link
            href={`/ws/${workspaceSlug}/challenges/${challengeSlug}/participants`}
            className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All participants
          </Link>

          <header className="mt-4 flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              {participant.profile.avatarUrl && <AvatarImage src={participant.profile.avatarUrl} alt="" />}
              <AvatarFallback className="bg-indigo-50 text-sm font-semibold text-indigo-700">
                {name.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-[24px] font-semibold leading-tight tracking-tight text-slate-900">
                {name}
              </h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">{participant.profile.email}</p>
              <p className="mt-1.5 text-[13px] text-slate-500">
                <span className="uppercase tracking-wide">{String(participant.status).toLowerCase()}</span>
                {' · '}joined {when(participant.registeredAt)}
                {lastActivity && <> · last active {when(lastActivity)}</>}
              </p>
            </div>
          </header>

          <dl className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {facts.map(({ Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <Icon className="h-4 w-4" />
                </span>
                <dd className="mt-2.5 text-[20px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                  {value}
                </dd>
                <dt className="mt-1 text-[13px] text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>

          {/* Badges */}
          {participant.badgeAwards.length > 0 && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Badges</h2>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {participant.badgeAwards.map((a) => {
                  const badge = badgeByKey(a.badgeKey)
                  if (!badge) return null
                  return (
                    <span
                      key={a.badgeKey}
                      title={`${badge.description} — ${when(a.awardedAt)}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] text-amber-900 ring-1 ring-amber-100"
                    >
                      <span aria-hidden="true">{badge.icon}</span> {badge.name}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {/* Submissions */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Submissions</h2>
            </header>
            {participant.submissions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing submitted yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {participant.submissions.map((s) => {
                  const step = stepTitle.get(s.stepId)
                  const withheld = s.isPrivate && !canSeePrivate
                  return (
                    <li key={s.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium text-slate-900">
                          {step ? step.title : 'Removed step'}
                        </span>
                        <span className="text-[12px] text-slate-400">{when(s.submittedAt)}</span>
                        {s.isPrivate && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            <Lock className="h-3 w-3" /> Private
                          </span>
                        )}
                        {s.reviewedAt && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        'mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed',
                        withheld ? 'text-slate-400' : 'text-slate-700'
                      )}>
                        {withheld
                          ? 'Marked private. Opening it needs permission to view private submissions.'
                          : readable(s.data) || 'No written answer.'}
                      </p>
                      {s.feedback && !withheld && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                          <span className="font-medium text-slate-700">Feedback: </span>
                          {s.feedback}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Communication history */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Mail className="h-4 w-4 text-slate-400" />
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Emails to this person
              </h2>
              <span className="ml-auto text-[12px] text-slate-400">
                {participant._count.posts} posts · {participant._count.comments} comments
              </span>
            </header>
            {deliveries.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing sent yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {deliveries.map((d) => (
                  <li key={d.id} className="flex items-center gap-4 px-5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{d.trigger}</span>
                    <span className={cn(
                      'shrink-0 text-[12px]',
                      d.status === 'sent' ? 'text-emerald-700'
                        : d.status === 'failed' ? 'text-red-600' : 'text-slate-500'
                    )}>
                      {d.status}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
                      {when(d.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
