import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Audit log — Challenge Studio' }

// This page used to list invented entries — "Robert Evans published a
// challenge", timestamps and IP addresses that never happened. An audit log
// that shows fiction is worse than no audit log: it is the one surface people
// trust when they need to know what actually occurred.
//
// Nothing writes an audit trail. Building it needs an audit_logs table
// (actor, action, subject, workspace, metadata, timestamp) and a write on
// every privileged mutation — role changes, publishing, deletions, invitations,
// member removal.
//
// Recent activity on the overview is derived from the rows themselves and is
// real, but it is not an audit log: it cannot show who did something, or
// anything that left no row behind.

export default function AdminAuditPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Who did what, across every workspace.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ScrollText className="h-6 w-6 text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-foreground">Not built yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Nothing writes an audit trail, so there is nothing to show. This page
            previously listed events that never happened — removed, because an
            audit log showing fiction is worse than none at all.
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Needs an <span className="font-mono">audit_logs</span> table and a write on
            every privileged mutation: role changes, publishing, deletions,
            invitations, member removal.
          </p>
          <Link href="/admin" className="mt-1 text-sm font-medium text-primary hover:underline">
            Recent activity on the overview is real →
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
