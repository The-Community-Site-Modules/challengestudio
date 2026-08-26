import Link from 'next/link'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  cancelInvitationAction,
} from '../../../actions'
import { InviteForm }     from './_components/invite-form'
import { MemberRow }      from './_components/member-row'
import { InvitationRow }  from './_components/invitation-row'

interface Props {
  params:       Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function TeamPage({ params, searchParams }: Props) {
  const { workspaceSlug }  = await params
  const { error, message } = await searchParams

  // Auth + workspace resolution — redirects if not member
  const { user, workspace, role } = await requireWorkspaceMember(workspaceSlug)

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN'
  const isOwner        = role === 'OWNER'

  // Fetch members with profiles
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      profile: {
        select: { fullName: true, email: true, avatarUrl: true },
      },
    },
    orderBy: [
      // Owners first, then admins, then members
      { role: 'asc' },
      { joinedAt: 'asc' },
    ],
  })

  // Fetch pending / expired invitations (only for admins/owners)
  const invitations = isOwnerOrAdmin
    ? await db.workspaceInvitation.findMany({
        where: { workspaceId: workspace.id, acceptedAt: null },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const activeInvitations  = invitations.filter(i => i.expiresAt >= new Date())
  const expiredInvitations = invitations.filter(i => i.expiresAt <  new Date())

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto p-8 max-w-4xl">
        <PageHeader
          title="Team"
          description="Manage who has access to your workspace and their roles."
        />

        {/* Error / success banners */}
        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {decodeURIComponent(error)}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            {decodeURIComponent(message)}
          </div>
        )}

        {/* Invite form — only admins/owners see this */}
        {isOwnerOrAdmin && (
          <div className="mt-6">
            <InviteForm
              workspaceId={workspace.id}
              action={inviteMemberAction}
            />
          </div>
        )}

        {/* Active members */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </h2>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={{
                    id:        member.id,
                    profileId: member.profileId,
                    role:      member.role,
                    profile:   member.profile,
                  }}
                  workspaceId={workspace.id}
                  currentUserId={user.id}
                  isCurrentUserOwner={isOwner}
                  removeMember={removeMemberAction}
                  updateRole={updateMemberRoleAction}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Pending invitations */}
        {isOwnerOrAdmin && activeInvitations.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {activeInvitations.length} pending invite{activeInvitations.length !== 1 ? 's' : ''}
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="divide-y divide-border">
                {activeInvitations.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={{ id: inv.id, email: inv.email, role: inv.role, token: inv.token, expiresAt: inv.expiresAt }}
                    workspaceId={workspace.id}
                    cancelInvitation={cancelInvitationAction}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expired invitations */}
        {isOwnerOrAdmin && expiredInvitations.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {expiredInvitations.length} expired invite{expiredInvitations.length !== 1 ? 's' : ''}
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card opacity-60">
              <div className="divide-y divide-border">
                {expiredInvitations.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={{ id: inv.id, email: inv.email, role: inv.role, token: inv.token, expiresAt: inv.expiresAt }}
                    workspaceId={workspace.id}
                    cancelInvitation={cancelInvitationAction}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Role guide */}
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="text-sm font-semibold text-foreground">Role permissions</h3>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <span className="w-16 shrink-0 font-medium text-foreground">Owner</span>
              Full workspace access including billing, settings, and ownership transfer.
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0 font-medium text-foreground">Admin</span>
              Full workspace access except billing and ownership transfer.
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0 font-medium text-foreground">Member</span>
              View workspace content and post in community. Cannot manage challenges.
            </div>
          </div>
          <Link href="#" className="mt-3 inline-block text-xs text-primary hover:underline">
            Learn more about roles →
          </Link>
        </div>
      </main>
    </div>
  )
}
