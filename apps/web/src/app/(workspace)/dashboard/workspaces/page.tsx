/**
 * Every workspace in the agency.
 *
 * A page of its own rather than a section of the dashboard, because the
 * sidebar row called Workspaces has to land somewhere that is only about
 * workspaces. The cards are the same component the dashboard uses, so the two
 * lists cannot drift apart.
 */

import { requireUser } from '@/lib/auth/session'
import { createWorkspaceAction } from '../../actions'
import { CreateWorkspace } from '../_components/create-workspace'
import { WorkspaceBrowser, type WorkspaceCardData } from '../_components/workspace-browser'
import { AgencyShell, CountStrip } from '../_components/agency-shell'
import { getWorkspaceSummaries, getPickerTotals } from '../_lib/queries'

export const metadata = { title: 'Workspaces — Challenge Studio' }
export const dynamic = 'force-dynamic'

export default async function AgencyWorkspacesPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)
  const totals = await getPickerTotals(user.id, summaries)

  const names = summaries.map((s) => s.name)
  const cards: WorkspaceCardData[] = summaries.map((s) => ({
    ...s,
    lastActivity: s.lastActivity.toISOString(),
    joinedAt: s.joinedAt.toISOString(),
  }))

  return (
    <AgencyShell
      workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
      userName={user.fullName ?? ''}
      userEmail={user.email}
      {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      eyebrow="Workspaces"
      title="All workspaces"
      description="Every workspace in your agency. Open one to work inside it."
      action={
        <CreateWorkspace
          createAction={createWorkspaceAction}
          existingNames={names}
          variant="button"
        />
      }
    >
      <CountStrip
        items={[
          { label: 'Workspaces', value: totals.workspaces },
          { label: 'Active challenges', value: totals.activeChallenges },
          { label: 'Team members', value: totals.teamMembers },
          { label: 'Participants', value: totals.participants },
        ]}
      />

      <div className="mt-8">
        <WorkspaceBrowser
          workspaces={cards}
          onCreate={
            <CreateWorkspace
              createAction={createWorkspaceAction}
              existingNames={names}
              variant="tile"
            />
          }
        />
      </div>
    </AgencyShell>
  )
}
