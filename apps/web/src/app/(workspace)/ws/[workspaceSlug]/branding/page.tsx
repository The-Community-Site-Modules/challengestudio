// Route: .../branding — workspace look and feel.
//
// A server shell so the sidebar (which reads the session) is not pulled into a
// client bundle. next/headers cannot cross that line, and importing it from a
// client page only fails at build time, not in dev.

import { requireWorkspaceMember } from '@/lib/auth/session'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import BrandingClient from './_components/branding-client'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export default async function BrandingPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <BrandingClient />
    </div>
  )
}
