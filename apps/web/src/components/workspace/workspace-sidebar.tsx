import { getCurrentUser } from '@/lib/auth/session'
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

  return (
    <WorkspaceSidebarNav
      {...props}
      userName={user?.fullName ?? ''}
      userEmail={user?.email ?? ''}
      {...(user?.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
    />
  )
}
