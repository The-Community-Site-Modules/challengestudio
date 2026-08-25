import { WorkspaceHeader } from '@/components/workspace/workspace-header'
import { getCurrentUser }  from '@/lib/auth/session'

// Workspace shell — wraps all authenticated creator/workspace pages.
// Sidebar is per-page (needs workspaceSlug from params).
// Header is shared and receives real user from session.

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <WorkspaceHeader
        userName={user?.fullName ?? user?.email ?? ''}
        userEmail={user?.email ?? ''}
      />
      <div className="flex flex-1">{children}</div>
    </div>
  )
}
