import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getWorkspaceRows } from '../_lib/queries'

export const metadata = { title: 'Workspaces — Challenge Studio' }
export const dynamic = 'force-dynamic'

// Plan and suspended/trial state are not in the schema — a workspace has no
// billing tier and no lifecycle flag. Those columns are left out rather than
// filled with something that looks authoritative and is not.

export default async function AdminWorkspacesPage() {
  const workspaces = await getWorkspaceRows()

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          {workspaces.length === 0
            ? 'No workspaces on this deployment yet.'
            : `${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'} on this deployment`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">No workspaces</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                They appear here as soon as anyone creates one.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2.2fr_1.4fr_repeat(3,0.7fr)_1fr] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Workspace</span>
                <span>Owner</span>
                <span className="text-right">Challenges</span>
                <span className="text-right">Members</span>
                <span className="text-right">Participants</span>
                <span className="text-right">Created</span>
              </div>
              <div className="divide-y divide-border">
                {workspaces.map((w) => (
                  <div
                    key={w.id}
                    className="grid grid-cols-[2.2fr_1.4fr_repeat(3,0.7fr)_1fr] items-center gap-4 px-5 py-3.5 hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/ws/${w.slug}`}
                        className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {w.name}
                      </Link>
                      <p className="truncate font-mono text-xs text-muted-foreground">/ws/{w.slug}</p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{w.ownerName}</p>
                    <p className="text-right text-sm tabular-nums text-muted-foreground">{w.challenges}</p>
                    <p className="text-right text-sm tabular-nums text-muted-foreground">{w.members}</p>
                    <p className="text-right text-sm font-semibold tabular-nums text-foreground">
                      {w.participants.toLocaleString()}
                    </p>
                    <p className="text-right text-sm text-muted-foreground">
                      {w.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
