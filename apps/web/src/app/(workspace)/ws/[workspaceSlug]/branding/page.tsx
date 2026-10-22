// Route: .../branding — workspace look and feel.
//
// A server shell so the sidebar (which reads the session) is not pulled into a
// client bundle. next/headers cannot cross that line, and importing it from a
// client page only fails at build time, not in dev.
//
// This used to fetch the workspace and then render <BrandingClient /> with no
// props, so the form showed "Acme Coaching" whatever the workspace was called.
// It now hands the real values down, and whether this person may change them.

import { requireWorkspaceMember } from '@/lib/auth/session'
import { roleCan } from '@/lib/permissions'
import { db } from '@/lib/db'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import BrandingClient from './_components/branding-client'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export const metadata = { title: 'Branding — Challenge Studio' }

export default async function BrandingPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug)

  const brand = await db.workspace.findUniqueOrThrow({
    where: { id: workspace.id },
    select: {
      name: true, logoUrl: true, faviconUrl: true,
      primaryColor: true, accentColor: true,
      senderName: true, supportEmail: true,
      privacyUrl: true, termsUrl: true,
    },
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />
      <BrandingClient
        workspaceSlug={workspaceSlug}
        initial={brand}
        canEdit={roleCan(role, 'workspace.branding.manage')}
        // Shown in the sender preview, so the creator sees the whole From line
        // a participant will see rather than only the half they control.
        platformSender={process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}
        platformSenderName={process.env.EMAIL_FROM_NAME || 'Challenge Studio'}
      />
    </div>
  )
}
