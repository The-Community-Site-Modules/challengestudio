import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { WorkspaceSidebarNav } from './workspace-sidebar-nav'

interface Props {
  workspaceSlug: string
  workspaceName: string
  challengeSlug?: string
  challengeTitle?: string
  /** Pending-review count shown against Submissions. */
  submissionCount?: number
}

/**
 * Workspace sidebar.
 *
 * A server component that reads the session itself, so the account card at the
 * bottom is always populated. Passing the user in from each page meant every
 * page had to remember — and seven of them did not, showing "Account" and a
 * question mark instead of whoever was signed in.
 */
export async function WorkspaceSidebar(props: Props) {
  const user = await getCurrentUser()

  // Every workspace this person belongs to, for the switcher. Without it the
  // only way back to the workspace list was to edit the URL.
  const memberships = user
    ? await db.workspaceMember.findMany({
        where:   { profileId: user.id },
        select:  { workspace: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'asc' },
      })
    : []

  return (
    <WorkspaceSidebarNav
      {...props}
      workspaces={memberships.map((m) => m.workspace)}
      userName={user?.fullName ?? ''}
      userEmail={user?.email ?? ''}
      {...(user?.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
    />
  )
}
