import { Search, Download, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const AUDIT_EVENTS = [
  { id: 'a1',  actor: 'robert@example.com',  action: 'challenge.publish',          object: 'challenge:5-day-launch',         workspace: 'Acme Coaching',   time: 'Aug 12, 2:14 PM', level: 'info' },
  { id: 'a2',  actor: 'robert@example.com',  action: 'participant.export',         object: 'challenge:5-day-launch',         workspace: 'Acme Coaching',   time: 'Aug 11, 4:02 PM', level: 'info' },
  { id: 'a3',  actor: 'sarah@example.com',   action: 'workspace.branding.manage',  object: 'workspace:fitlife-pro',          workspace: 'FitLife Pro',     time: 'Aug 11, 11:30 AM', level: 'info' },
  { id: 'a4',  actor: 'admin@platform.com',  action: 'workspace.suspend',          object: 'workspace:deactivated-co',       workspace: 'Platform',        time: 'Aug 10, 9:00 AM', level: 'warn' },
  { id: 'a5',  actor: 'marcus@example.com',  action: 'workspace.team.manage',      object: 'user:new-admin@example.com',     workspace: 'AgencyPro',       time: 'Aug 10, 8:44 AM', level: 'info' },
  { id: 'a6',  actor: 'robert@example.com',  action: 'challenge.close',            object: 'challenge:old-challenge',        workspace: 'Acme Coaching',   time: 'Aug 9, 5:00 PM',  level: 'info' },
  { id: 'a7',  actor: 'bad@example.com',     action: 'community.moderate',         object: 'submission:s123',                workspace: 'FitLife Pro',     time: 'Aug 9, 2:30 PM',  level: 'warn' },
  { id: 'a8',  actor: 'admin@platform.com',  action: 'user.suspend',               object: 'user:bad@example.com',           workspace: 'Platform',        time: 'Aug 9, 3:15 PM',  level: 'critical' },
  { id: 'a9',  actor: 'priya@example.com',   action: 'integration.manage',         object: 'workspace:launch-academy',       workspace: 'Launch Academy',  time: 'Aug 8, 1:00 PM',  level: 'info' },
  { id: 'a10', actor: 'robert@example.com',  action: 'analytics.export',           object: 'challenge:5-day-launch',         workspace: 'Acme Coaching',   time: 'Aug 7, 10:20 AM', level: 'info' },
]

const levelConfig: Record<string, { label: string; class: string }> = {
  info:     { label: 'Info',     class: 'bg-blue-100 text-blue-700' },
  warn:     { label: 'Warning',  class: 'bg-yellow-100 text-yellow-700' },
  critical: { label: 'Critical', class: 'bg-red-100 text-red-700' },
}

export default function AdminAuditPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Audit Log</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable record of all critical administrative actions across the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Download className="h-4 w-4" /> Export log
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by actor, action, or object..." className="pl-9" />
        </div>
        <Select>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="challenge">Challenge actions</SelectItem>
            <SelectItem value="participant">Participant actions</SelectItem>
            <SelectItem value="workspace">Workspace actions</SelectItem>
            <SelectItem value="user">User actions</SelectItem>
            <SelectItem value="integration">Integration actions</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_80px] gap-4 border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Actor</span>
            <span>Action</span>
            <span>Object / Workspace</span>
            <span>Time</span>
            <span>Level</span>
          </div>
          <div className="divide-y divide-border">
            {AUDIT_EVENTS.map((e) => {
              const lvl = levelConfig[e.level] ?? levelConfig.info
              return (
                <div
                  key={e.id}
                  className={`grid grid-cols-[1.5fr_1.5fr_2fr_1fr_80px] items-start gap-4 px-5 py-3.5 hover:bg-muted/30 ${e.level === 'critical' ? 'bg-red-50/50' : ''}`}
                >
                  <p className="text-xs text-foreground truncate font-medium">{e.actor}</p>
                  <code className="text-xs bg-muted rounded px-1.5 py-0.5 text-foreground font-mono truncate">
                    {e.action}
                  </code>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{e.object}</p>
                    <p className="text-[10px] text-muted-foreground">{e.workspace}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{e.time}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${lvl.class}`}>
                    {lvl.label}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="border-t border-border px-5 py-4 text-center">
            <Button variant="outline" size="sm">Load more</Button>
            <p className="mt-1 text-xs text-muted-foreground">Showing 10 of 12,841 entries</p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
