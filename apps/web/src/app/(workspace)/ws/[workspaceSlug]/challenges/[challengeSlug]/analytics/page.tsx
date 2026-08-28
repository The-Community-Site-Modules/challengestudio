// Route: .../challenges/[challengeSlug]/analytics — PRD §17.1.
//
// This was three hardcoded arrays: invented completion curves and a made-up
// at-risk list, shown to a creator about their own real challenge. Every
// number here is now counted from the records that produced it, because §27
// asks that "creator totals match the underlying registrations, enrollments,
// and completion records" — and the only way to keep that true is to count.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users, TrendingUp, CheckCircle2, Send, MessageSquare,
  MousePointerClick, Download, AlertTriangle,
} from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { TimeSeriesChart } from '@/components/shared/time-series-chart'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { challengeMetrics } from '@/lib/analytics/challenge-metrics'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Analytics — Challenge Studio' }

export default async function ChallengeAnalyticsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  const [canView, canExport] = await Promise.all([
    hasPermission(user.id, workspace.id, 'analytics.view'),
    hasPermission(user.id, workspace.id, 'workspace.export'),
  ])
  if (!canView) redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true },
  })
  if (!challenge) notFound()

  const m = await challengeMetrics(challenge.id)

  const stats = [
    { Icon: Users,        label: 'Registrations',   value: String(m.registrations), hint: `${m.activated} started (${m.activationRate}%)` },
    { Icon: CheckCircle2, label: 'Completion rate', value: `${m.completionRate}%`,  hint: `${m.completed} finished` },
    { Icon: TrendingUp,   label: 'Average steps',   value: String(m.averageDaysCompleted), hint: 'completed per participant' },
    { Icon: Send,         label: 'Submission rate', value: `${m.submissionRate}%`,  hint: 'of steps reached' },
  ]

  const secondary = [
    { Icon: MessageSquare,      label: 'Took part in the community', value: `${m.communityParticipants} (${m.communityRate}%)` },
    { Icon: MousePointerClick,  label: 'Offer clicks',               value: String(m.offerClicks) },
    { Icon: Users,              label: 'Live sessions scheduled',    value: String(m.liveSessions) },
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
        <div className="mx-auto w-full max-w-[1000px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title="Analytics"
              description={`How ${challenge.title} is going. Counted from the records, nothing estimated.`}
            />
            {canExport && (
              <Link
                href={`/ws/${workspaceSlug}/challenges/${challengeSlug}/analytics/export`}
                prefetch={false}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Download className="h-4 w-4" /> Export CSV
              </Link>
            )}
          </div>

          {/* Headline metrics */}
          <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(({ Icon, label, value, hint }) => (
              <div key={label} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-3 text-[24px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                  {value}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-700">{label}</span>
                <p className="mt-0.5 text-[12px] leading-tight text-slate-500">{hint}</p>
              </div>
            ))}
          </div>

          {/* Registration trend */}
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Registrations</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">New participants per day, last 30 days.</p>
            <div className="mt-5">
              <TimeSeriesChart
                data={m.registrationTrend}
                seriesLabel="Registrations"
                emptyMessage="No registrations in this period."
              />
            </div>
          </section>

          {/* Day-by-day reach and completion */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Day by day
              </h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                How many the step opened for, and how many did it.
              </p>
            </header>
            {m.dayByDay.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No published steps yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {m.dayByDay.map((d) => {
                  const rate = d.reached > 0 ? Math.round((d.completed / d.reached) * 100) : 0
                  return (
                    <li key={d.stepId} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                      <span className="w-7 shrink-0 text-[13px] tabular-nums text-slate-500">
                        {d.order + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{d.title}</span>
                      <span className="hidden w-40 shrink-0 sm:block">
                        <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-indigo-500"
                            style={{ width: `${rate}%` }}
                          />
                        </span>
                      </span>
                      <span className="w-28 shrink-0 text-right text-[13px] tabular-nums text-slate-600">
                        {d.completed} of {d.reached}
                      </span>
                      <span className="w-12 shrink-0 text-right text-[13px] font-medium tabular-nums text-slate-900">
                        {rate}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Secondary metrics */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {secondary.map(({ Icon, label, value }) => (
                <li key={label} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{label}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">{value}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* At risk */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 sm:px-6">
              <AlertTriangle className={cn('h-4 w-4', m.atRisk.length > 0 ? 'text-amber-500' : 'text-slate-500')} />
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Falling behind
              </h2>
              <span className="ml-auto text-[12px] text-slate-500">
                nothing submitted for 3 days or more
              </span>
            </header>
            {m.atRisk.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                Nobody is behind right now.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {m.atRisk.map((p) => (
                  <li key={p.participantId} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{p.name}</span>
                      <span className="block truncate text-[12px] text-slate-500">{p.email}</span>
                    </span>
                    <span className="w-28 shrink-0 text-right text-[13px] tabular-nums text-slate-600">
                      {p.completedSteps} of {p.totalSteps}
                    </span>
                    <span className="w-32 shrink-0 text-right text-[13px] text-slate-500">
                      {p.daysSinceActivity === null
                        ? 'never started'
                        : `${p.daysSinceActivity} days quiet`}
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
