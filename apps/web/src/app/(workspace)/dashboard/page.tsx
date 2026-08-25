import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser, getUserWorkspaces } from '@/lib/auth/session'
import { createWorkspaceAction } from '../actions'
import { UrlToast } from '@/components/shared/url-toast'

interface Props {
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireUser()
  // searchParams consumed by UrlToast client component
  void searchParams

  const memberships = await getUserWorkspaces(user.id)

  // Single workspace → go straight there
  if (memberships.length === 1) {
    redirect(`/ws/${memberships[0].workspace.slug}`)
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center pt-16 px-4">
      <UrlToast />
      <div className="w-full max-w-lg space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-foreground">Your workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a workspace or create a new one.
          </p>
        </div>

        {/* Workspace list */}
        {memberships.length > 0 ? (
          <div className="space-y-2">
            {memberships.map(({ workspace }) => (
              <Link
                key={workspace.id}
                href={`/ws/${workspace.slug}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                {/* Logo / initials */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {workspace.logoUrl
                    ? <img src={workspace.logoUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                    : workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {workspace._count.challenges} challenge{workspace._count.challenges !== 1 ? 's' : ''}
                    {' · '}challengestudio.com/ws/{workspace.slug}
                  </p>
                </div>
                <Zap className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Zap className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No workspaces yet</p>
              <p className="text-xs text-muted-foreground">
                Create your first workspace to start building challenges.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create workspace */}
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
          <h2 className="text-sm font-semibold text-foreground">Create a new workspace</h2>
          <p className="mt-0.5 text-xs text-muted-foreground mb-4">
            Each workspace has its own challenges, team, and branding.
          </p>
          <form action={createWorkspaceAction} className="flex gap-2">
            <input
              name="name"
              type="text"
              placeholder="My Coaching Studio"
              required
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </form>
        </div>

      </div>
    </div>
  )
}
