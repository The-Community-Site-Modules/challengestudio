/**
 * Every participant in the agency — one row per person, with the workspaces
 * they are enrolled in.
 *
 * One row per *person*, not per enrolment: somebody who joined three of your
 * challenges is one participant, and a list that repeated them would make the
 * agency look busier than it is. The workspaces are what the row is for, so
 * they are on it rather than behind a click.
 */

import { requireUser } from '@/lib/auth/session'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { AgencyShell, CountStrip, NothingYet, WorkspaceTag } from '../_components/agency-shell'
import { getWorkspaceSummaries, getAgencyParticipants, permitted } from '../_lib/queries'

export const metadata = { title: 'Participants — Challenge Studio' }
export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: 'Active',    className: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'bg-violet-50 text-violet-700' },
  PENDING:   { label: 'Pending',   className: 'bg-amber-50 text-amber-700' },
  REJECTED:  { label: 'Rejected',  className: 'bg-rose-50 text-rose-700' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-100 text-slate-600' },
}

function initials(name: string, email: string) {
  return (name || email || '?')
    .split(/[\s@._-]+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

export default async function AgencyParticipantsPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)
  const people = await getAgencyParticipants(summaries)
  // The query already leaves out workspaces this person may not see into;
  // these are for saying so, rather than letting an empty list look like
  // nobody has registered.
  const visible = permitted(summaries, 'participant.view')
  const hidden = summaries.length - visible.length

  const enrolments = people.reduce((n, p) => n + p.enrolments.length, 0)
  const completed = people.filter((p) =>
    p.enrolments.some((e) => e.status === 'COMPLETED')).length
  const pending = people.filter((p) =>
    p.enrolments.some((e) => e.status === 'PENDING')).length

  return (
    <AgencyShell
      workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
      userName={user.fullName ?? ''}
      userEmail={user.email}
      {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      eyebrow="Participants"
      title="All participants"
      description="Everyone taking part across every workspace, counted once each."
    >
      {visible.length === 0 ? (
        <NothingYet
          title="Participants are not visible to you"
          body="Your role in these workspaces does not include seeing who takes part. A workspace owner or admin can change that."
        />
      ) : people.length === 0 ? (
        <NothingYet
          title="No participants yet"
          body="People appear here as soon as they register for one of your challenges."
        />
      ) : (
        <>
          <CountStrip
            items={[
              { label: 'People', value: people.length },
              { label: 'Enrolments', value: enrolments },
              { label: 'Have completed one', value: completed },
              { label: 'Awaiting approval', value: pending },
            ]}
          />

          {hidden > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Showing {visible.length} of {summaries.length} workspaces. In the
              other {hidden === 1 ? 'one' : hidden}, your role does not include seeing participants.
            </p>
          )}

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {people.map((p) => (
                <li key={p.profileId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name} />}
                    <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {initials(p.name, p.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-[180px] flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{p.email}</span>
                  </div>

                  {/* The workspaces this person is enrolled in — the reason
                      this page exists rather than five separate ones. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {p.workspaces.map((w) => (
                      <WorkspaceTag key={w} name={w} />
                    ))}
                  </div>

                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {p.enrolments.length} {p.enrolments.length === 1 ? 'challenge' : 'challenges'}
                    {' · '}
                    {p.submissions} {p.submissions === 1 ? 'submission' : 'submissions'}
                  </span>

                  <div className="flex shrink-0 flex-wrap gap-1">
                    {[...new Set(p.enrolments.map((e) => e.status))].map((status) => {
                      const style = STATUS_STYLE[status] ?? {
                        label: status, className: 'bg-slate-100 text-slate-600',
                      }
                      return (
                        <span
                          key={status}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium',
                            style.className
                          )}
                        >
                          {style.label}
                        </span>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </AgencyShell>
  )
}
