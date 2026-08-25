import { WorkspaceHeader } from '@/components/workspace/workspace-header'
import { getCurrentUser }  from '@/lib/auth/session'

// Account shell — the signed-in user's own pages, outside any workspace.
// Same header as the workspace shell so moving between them is not a jolt.

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col">
      <WorkspaceHeader
        userName={user?.fullName ?? user?.email ?? ''}
        userEmail={user?.email ?? ''}
        {...(user?.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      />
      <div className="flex flex-1 bg-muted/20">{children}</div>
    </div>
  )
}
