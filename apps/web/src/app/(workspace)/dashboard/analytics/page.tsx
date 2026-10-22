/**
 * The agency's numbers: the funnel across every workspace, and the same
 * figures broken down per workspace so a quiet one is visible.
 *
 * Deliberately not a second copy of the per-workspace analytics page. That one
 * answers "how is this challenge doing"; this one answers "where is the agency
 * spending its effort", which is a different question and needs the workspace
 * on every row.
 */

import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { TimeSeriesChart } from '@/components/shared/time-series-chart'
import { AgencyShell, CountStrip, NothingYet } from '../_components/agency-shell'
import { getWorkspaceSummaries, getPickerTotals, getAgencyOverview } from '../_lib/queries'

export const metadata = { title: 'Analytics — Challenge Studio' }
export const dynamic = 'force-dynamic'

export default async function AgencyAnalyticsPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)
  const [totals, agency] = await Promise.all([
    getPickerTotals(user.id, summaries),
    getAgencyOverview(summaries),
  ])

  const registrations30 = agency.registrations.reduce((n, r) => n + r.value, 0)

  return (
    <AgencyShell
      workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
      userName={user.fullName ?? ''}
      userEmail={user.email}
      {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      eyebrow="Analytics"
      title="Agency analytics"
      description="Every workspace combined, and each one on its own."
    >
      {summaries.length === 0 ? (
        <NothingYet
          title="Nothing to measure yet"
          body="Create a workspace and publish a challenge, and the numbers start here."
        />
      ) : (
        <>
          <CountStrip
            items={[
              { label: 'Participants, all time', value: totals.participants },
              { label: 'Registered in 30 days', value: registrations30 },
              { label: 'Active challenges', value: totals.activeChallenges },
              { label: 'Submissions to review', value: agency.pendingReviews },
            ]}
          />

          <section className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              Registrations
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Last 30 days, every workspace combined
            </p>
            <div className="mt-2">
              <TimeSeriesChart
                data={agency.registrations}
                seriesLabel="Registrations"
                height={200}
                emptyMessage="No registrations in the last 30 days."
              />
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                By workspace
              </h2>
            </header>
            <ul className="divide-y divide-slate-100">
              {summaries.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/ws/${s.slug}/analytics`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">
                      {s.name.trim().charAt(0).toUpperCase() || 'W'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {s.challenges} {s.challenges === 1 ? 'challenge' : 'challenges'}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {s.participants} {s.participants === 1 ? 'participant' : 'participants'}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {s.members} {s.members === 1 ? 'member' : 'members'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AgencyShell>
  )
}
