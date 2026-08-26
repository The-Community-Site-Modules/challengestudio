import { Users as UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { getUserRows } from '../_lib/queries'

export const metadata = { title: 'Users — Challenge Studio' }
export const dynamic = 'force-dynamic'

// A profile carries no platform role, no suspended flag and no last-seen
// timestamp, so those columns are gone. What is shown instead is derived from
// rows that do exist: whether they own a workspace, how many they belong to,
// and how many challenges they have joined.

function initialsOf(name: string, email: string) {
  const source = name.trim() && name !== '—' ? name : email
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default async function AdminUsersPage() {
  const { rows: users, total } = await getUserRows()

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'Nobody has signed up yet.'
            : users.length < total
              // Say what is on screen as well as the total — "100 accounts"
              // under a list capped at 100 misstates a platform of 552.
              ? `Newest ${users.length} of ${total.toLocaleString()} accounts`
              : `${total} account${total === 1 ? '' : 's'}, newest first`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <UsersIcon className="h-6 w-6 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium text-foreground">No users</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Accounts appear here as soon as anyone signs up.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2.4fr_1fr_repeat(2,0.8fr)_1fr] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>User</span>
                <span>Type</span>
                <span className="text-right">Workspaces</span>
                <span className="text-right">Challenges</span>
                <span className="text-right">Joined</span>
              </div>
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[2.4fr_1fr_repeat(2,0.8fr)_1fr] items-center gap-4 px-5 py-3.5 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
                          {initialsOf(u.name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div>
                      <Badge variant={u.ownsWorkspace ? 'default' : 'secondary'} className="text-[10px]">
                        {u.ownsWorkspace ? 'Creator' : 'Participant'}
                      </Badge>
                    </div>
                    <p className="text-right text-sm tabular-nums text-muted-foreground">{u.workspaces}</p>
                    <p className="text-right text-sm tabular-nums text-muted-foreground">{u.participations}</p>
                    <p className="text-right text-sm text-muted-foreground">
                      {u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
