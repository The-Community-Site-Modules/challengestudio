import { Search, MoreHorizontal, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const USERS = [
  { id: 'u1', initials: 'RE', name: 'Robert Evans',  email: 'robert@example.com',  role: 'workspace_owner', workspaces: 1, joined: 'Jul 12', status: 'active',    lastSeen: 'Today' },
  { id: 'u2', initials: 'SK', name: 'Sarah Kim',     email: 'sarah@example.com',   role: 'workspace_owner', workspaces: 1, joined: 'Jun 3',  status: 'active',    lastSeen: 'Today' },
  { id: 'u3', initials: 'AP', name: 'Aisha Patel',   email: 'aisha@example.com',   role: 'participant',     workspaces: 1, joined: 'Aug 10', status: 'active',    lastSeen: '1h ago' },
  { id: 'u4', initials: 'TW', name: 'Tom Walsh',     email: 'tom@example.com',     role: 'workspace_owner', workspaces: 2, joined: 'Jul 29', status: 'active',    lastSeen: 'Yesterday' },
  { id: 'u5', initials: 'PR', name: 'Priya Rajan',   email: 'priya@example.com',   role: 'participant',     workspaces: 1, joined: 'Aug 8',  status: 'active',    lastSeen: '3 days ago' },
  { id: 'u6', initials: 'MB', name: 'Marcus Brown',  email: 'marcus@example.com',  role: 'workspace_owner', workspaces: 1, joined: 'May 18', status: 'active',    lastSeen: 'Today' },
  { id: 'u7', initials: 'BU', name: 'Banned User',   email: 'bad@example.com',     role: 'participant',     workspaces: 0, joined: 'Aug 1',  status: 'suspended', lastSeen: '5 days ago' },
]

const roleLabel: Record<string, string> = {
  platform_owner:  'Platform Owner',
  workspace_owner: 'Workspace Owner',
  participant:     'Participant',
}

export default function AdminUsersPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">8,241 total users across all workspaces</p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" />
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="owners">Owners</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_60px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>User</span>
            <span>Role</span>
            <span>Workspaces</span>
            <span>Last active</span>
            <span></span>
          </div>
          <div className="divide-y divide-border">
            {USERS.map((u) => (
              <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_60px] items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${u.status === 'suspended' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                      {u.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      {u.status === 'suspended' && <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{roleLabel[u.role]}</p>

                <p className="text-sm text-muted-foreground">{u.workspaces}</p>

                <p className="text-xs text-muted-foreground">{u.lastSeen}</p>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View profile</DropdownMenuItem>
                    <DropdownMenuItem>View activity</DropdownMenuItem>
                    <DropdownMenuItem>Send email</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {u.status === 'suspended' ? (
                      <DropdownMenuItem>Reinstate account</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-destructive">Suspend account</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-4 text-center">
            <Button variant="outline" size="sm">Load more</Button>
            <p className="mt-1 text-xs text-muted-foreground">Showing 7 of 8,241</p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
