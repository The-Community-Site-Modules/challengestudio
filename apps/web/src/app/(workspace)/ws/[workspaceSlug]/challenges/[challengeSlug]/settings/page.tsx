// Route: .../challenges/[challengeSlug]/settings
//
// Server shell so the sidebar — which reads the session — stays out of the
// client bundle. next/headers cannot cross that boundary, and importing it
// from a client page fails only at build time, never in dev.

import { requireWorkspaceMember } from '@/lib/auth/session'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import ChallengeSettingsClient from './_components/settings-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export default async function ChallengeSettingsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  return (
    <div className="flex flex-1">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
      />
      <ChallengeSettingsClient />
    </div>
  )
}
