/**
 * Everyone who works in the agency — one row per colleague, with every
 * workspace they belong to and the role they hold in each.
 *
 * Counted once each, which is why the total here agrees with the Team members
 * tile on the dashboard: a colleague in three workspaces is one colleague, not
 * three. Roles can differ per workspace, so the role sits on the membership
 * rather than on the person.
 *
 * Inviting and removing stay inside a workspace: a membership is granted to one
 * workspace at a time, and this page deliberately does not pretend otherwise.
 */

import { requireUser } from '@/lib/auth/session'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { AgencyShell, CountStrip, NothingYet } from '../_components/agency-shell'
import { getWorkspaceSummaries, getAgencyTeam } from '../_lib/queries'

export const metadata = { title: 'Team — Challenge Studio' }
export const dynamic = 'force-dynamic'

const ROLE_STYLE: Record<string, string> = {
  OWNER:  'bg-indigo-50 text-indigo-700',
  ADMIN:  'bg-sky-50 text-sky-700',
  MEMBER: 'bg-slate-100 text-slate-600',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member',
}

function initials(name: string, email: string) {
  return (name || email || '?')
    .split(/[\s@._-]+/).filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

export default async function AgencyTeamPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)
  const members = await getAgencyTeam(summaries)

  const memberships = members.reduce((n, m) => n + m.memberships.length, 0)
  const owners = members.filter((m) =>
    m.memberships.some((x) => x.role === 'OWNER')).length
  const inMoreThanOne = members.filter((m) => m.memberships.length > 1).length

  return (
    <AgencyShell
      workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
      userName={user.fullName ?? ''}
      userEmail={user.email}
      {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      eyebrow="Team"
      title="All team members"
      description="Everyone you share a workspace with, counted once. Invite people from the workspace they are joining."
    >
      {members.length === 0 ? (
        <NothingYet
          title="No team members yet"
          body="Create a workspace and invite people to it, and they will appear here."
        />
      ) : (
        <>
          <CountStrip
            items={[
              { label: 'Total members', value: members.length },
              { label: 'Memberships', value: memberships },
              { label: 'Owners', value: owners },
              { label: 'In more than one workspace', value: inMoreThanOne },
            ]}
          />

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.profileId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <Avatar className="h-9 w-9 shrink-0">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name} />}
                    <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {initials(m.name, m.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-[180px] flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {m.name}
                      {m.profileId === user.id && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{m.email}</span>
                  </div>

                  {/* Workspace and role together, because the role is held in
                      a workspace and can differ between them. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {m.memberships.map((x) => (
                      <span
                        key={x.workspaceSlug + x.role}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-1 pr-2 text-[11px] font-medium text-slate-600"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[9px] font-bold text-slate-500">
                          {x.workspaceName.trim().charAt(0).toUpperCase() || 'W'}
                        </span>
                        {x.workspaceName}
                        <span className={cn('rounded-full px-1.5', ROLE_STYLE[x.role] ?? ROLE_STYLE['MEMBER'])}>
                          {ROLE_LABEL[x.role] ?? x.role}
                        </span>
                      </span>
                    ))}
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
