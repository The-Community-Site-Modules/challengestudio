// Route: /ws/[workspaceSlug]/analytics
//
// Workspace-level numbers. Every figure here is counted from the database at
// request time — nothing is estimated, and nothing is shown that cannot be
// derived from what the app actually records.

import { BarChart3, Users, Trophy, CheckCircle2 } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { TimeSeriesChart, type TimePoint } from '@/components/shared/time-series-chart'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export const metadata = { title: 'Analytics — Challenge Studio' }

const DAYS = 30

export default async function AnalyticsPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const since = new Date()
  since.setDate(since.getDate() - (DAYS - 1))
  since.setHours(0, 0, 0, 0)

  const inWorkspace = { challenge: { workspaceId: workspace.id } }

  const [challenges, participants, completed, submissions, registrations, perChallenge] =
    await Promise.all([
      db.challenge.count({ where: { workspaceId: workspace.id } }),
      db.participant.count({ where: inWorkspace }),
      db.participant.count({ where: { ...inWorkspace, status: 'COMPLETED' as never } }),
      db.submission.count({ where: { participant: inWorkspace } }),
      db.participant.findMany({
        where:  { ...inWorkspace, registeredAt: { gte: since } },
        select: { registeredAt: true },
      }),
      db.challenge.findMany({
        where:   { workspaceId: workspace.id },
        select:  {
          id: true, title: true, status: true,
          _count: { select: { participants: true, steps: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

  // One bucket per day so a quiet day reads as zero rather than disappearing.
  const buckets = new Map<string, number>()
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since)
    d.setDate(since.getDate() + i)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const r of registrations) {
    const key = r.registeredAt.toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const series: TimePoint[] = [...buckets].map(([date, value]) => ({ date, value }))

  const completionRate = participants > 0 ? Math.round((completed / participants) * 100) : 0

  const stats = [
    { Icon: Trophy,       label: 'Challenges',      value: String(challenges),     hint: 'in this workspace' },
    { Icon: Users,        label: 'Participants',    value: String(participants),   hint: `${registrations.length} joined in ${DAYS} days` },
    { Icon: CheckCircle2, label: 'Completion rate', value: `${completionRate}%`,   hint: `${completed} finished` },
    { Icon: BarChart3,    label: 'Submissions',     value: String(submissions),    hint: 'all time' },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Analytics"
            description={`How ${workspace.name} is doing. Counted live, nothing estimated.`}
          />

          <dl className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(({ Icon, label, value, hint }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                  <Icon className="h-4 w-4" />
                </span>
                <dd className="mt-3 text-[24px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                  {value}
                </dd>
                <dt className="mt-1.5 text-[13px] font-medium text-slate-700">{label}</dt>
                <p className="mt-0.5 text-[12px] leading-tight text-slate-500">{hint}</p>
              </div>
            ))}
          </dl>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Registrations
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              New participants per day over the last {DAYS} days.
            </p>
            <div className="mt-5">
              <TimeSeriesChart
                data={series}
                seriesLabel="Registrations"
                emptyMessage="No registrations in this period. This fills in as people join your challenges."
              />
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                By challenge
              </h2>
            </div>
            {perChallenge.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
                No challenges yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {perChallenge.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {c.title}
                    </span>
                    <span className="shrink-0 text-[12px] uppercase tracking-wide text-slate-400">
                      {String(c.status).toLowerCase()}
                    </span>
                    <span className="w-20 shrink-0 text-right text-[13px] tabular-nums text-slate-600">
                      {c._count.steps} steps
                    </span>
                    <span className="w-24 shrink-0 text-right text-[13px] tabular-nums text-slate-600">
                      {c._count.participants} joined
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
