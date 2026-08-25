import { Badge }            from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader }       from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission }    from '@/lib/permissions'
import { db }               from '@/lib/db'
import { updateWorkspaceAction, deleteWorkspaceAction } from '../../../actions'
import { SettingsForm }     from './_components/settings-form'
import { DeleteWorkspace }  from './_components/delete-workspace'

interface Props {
  params:       Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}

export default async function WorkspaceSettingsPage({ params, searchParams }: Props) {
  const { workspaceSlug }  = await params
  const { saved, error }   = await searchParams

  // Auth + membership check
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  // Permission check — only OWNER/ADMIN can edit settings
  const canEdit   = await hasPermission(user.id, workspace.id, 'workspace.edit')
  const canDelete = await hasPermission(user.id, workspace.id, 'workspace.delete')

  // Counts for usage display
  const [challengeCount, participantCount, memberCount] = await Promise.all([
    db.challenge.count({ where: { workspaceId: workspace.id } }),
    db.participant.count({ where: { challenge: { workspaceId: workspace.id } } }),
    db.workspaceMember.count({ where: { workspaceId: workspace.id } }),
  ])

  return (
    <div className="flex flex-1">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto p-8">
        <PageHeader
          title="Workspace Settings"
          description="Manage your workspace name, URL, timezone, and account."
        />

        <div className="mt-6 space-y-6 max-w-2xl">

          {/* Saved / error banners */}
          {saved && (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
              Settings saved successfully.
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {decodeURIComponent(error)}
            </div>
          )}

          {/* General settings — editable form */}
          {canEdit ? (
            <SettingsForm
              workspaceId={workspace.id}
              initialName={workspace.name}
              initialSlug={workspace.slug}
              initialTimezone={(workspace as { timezone?: string }).timezone ?? 'UTC'}
              updateAction={updateWorkspaceAction}
            />
          ) : (
            /* Read-only view for non-editors */
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Name: </span>{workspace.name}</p>
                <p><span className="font-medium text-foreground">Slug: </span>/ws/{workspace.slug}</p>
              </CardContent>
            </Card>
          )}

          {/* Plan & usage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan & usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Starter plan</p>
                    <Badge variant="secondary">Current plan</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Free during beta</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Challenges',   used: challengeCount,  limit: 5   },
                  { label: 'Participants', used: participantCount, limit: 500 },
                  { label: 'Members',      used: memberCount,      limit: 10  },
                ].map((u) => (
                  <div key={u.label} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{u.label}</p>
                    <p className="mt-1 text-base font-bold text-foreground">
                      {u.used} / {u.limit}
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min((u.used / u.limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger zone — only owners can delete */}
          {canDelete && (
            <DeleteWorkspace
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              deleteAction={deleteWorkspaceAction}
            />
          )}

        </div>
      </main>
    </div>
  )
}
