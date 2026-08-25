import { Search, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const WORKSPACES = [
  { id: 'w1', name: 'Acme Coaching',     slug: 'acme-coaching',    owner: 'Robert Evans',  plan: 'starter',    challenges: 4,  participants: 612,   status: 'active',  created: 'Jul 12' },
  { id: 'w2', name: 'FitLife Pro',       slug: 'fitlife-pro',      owner: 'Sarah Kim',     plan: 'pro',        challenges: 7,  participants: 1840,  status: 'active',  created: 'Jun 3' },
  { id: 'w3', name: 'AgencyPro',         slug: 'agencypro',        owner: 'Marcus Brown',  plan: 'agency',     challenges: 12, participants: 3402,  status: 'active',  created: 'May 18' },
  { id: 'w4', name: 'Launch Academy',    slug: 'launch-academy',   owner: 'Priya Nair',    plan: 'starter',    challenges: 3,  participants: 441,   status: 'trial',   created: 'Aug 1' },
  { id: 'w5', name: 'Mindset Masters',   slug: 'mindset-masters',  owner: 'Tom Walsh',     plan: 'starter',    challenges: 2,  participants: 189,   status: 'active',  created: 'Jul 29' },
  { id: 'w6', name: 'Faith Forward',     slug: 'faith-forward',    owner: 'Grace Osei',    plan: 'starter',    challenges: 1,  participants: 78,    status: 'active',  created: 'Aug 5' },
  { id: 'w7', name: 'Deactivated Co.',   slug: 'deactivated-co',   owner: 'Old User',      plan: 'starter',    challenges: 0,  participants: 12,    status: 'suspended',created: 'Apr 2' },
]

const planColors: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  pro:     'bg-blue-100 text-blue-700',
  agency:  'bg-purple-100 text-purple-700',
}
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
const statusColors: Record<string, BadgeVariant> = {
  active:    'success',
  trial:     'warning',
  suspended: 'destructive',
}

export default function AdminWorkspacesPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground">{WORKSPACES.length} workspaces · 47 total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search workspaces..." className="pl-9" />
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All (47)</TabsTrigger>
            <TabsTrigger value="active">Active (41)</TabsTrigger>
            <TabsTrigger value="trial">Trial (4)</TabsTrigger>
            <TabsTrigger value="suspended">Suspended (2)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Workspace</span>
            <span>Owner</span>
            <span>Plan</span>
            <span>Usage</span>
            <span>Status</span>
            <span></span>
          </div>
          <div className="divide-y divide-border">
            {WORKSPACES.map((ws) => (
              <div key={ws.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_60px] items-center gap-4 px-5 py-4 hover:bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {ws.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ws.name}</p>
                    <p className="text-xs text-muted-foreground truncate">/{ws.slug}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground truncate">{ws.owner}</p>

                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${planColors[ws.plan]}`}>
                  {ws.plan}
                </span>

                <div className="text-xs text-muted-foreground">
                  <p>{ws.challenges} challenges</p>
                  <p>{ws.participants.toLocaleString()} participants</p>
                </div>

                <Badge variant={statusColors[ws.status]} className="text-[10px] w-fit capitalize">
                  {ws.status}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View workspace</DropdownMenuItem>
                    <DropdownMenuItem>Impersonate owner</DropdownMenuItem>
                    <DropdownMenuItem>Change plan</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Suspend workspace</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-4 text-center">
            <Button variant="outline" size="sm">Load more</Button>
            <p className="mt-1 text-xs text-muted-foreground">Showing 7 of 47</p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
