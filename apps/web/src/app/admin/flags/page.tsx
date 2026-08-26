import { Flag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Feature flags — Challenge Studio' }

// This page used to render six toggles over a hardcoded array. They looked
// operable and controlled nothing — there is no feature_flags table, and no
// code anywhere reads a flag.
//
// Rather than keep switches that do not switch anything, say what is missing.
// Building this needs a table (key, description, enabled, optional workspace
// scope), a read path the app actually consults, and an audit entry per change
// so a flip can be traced.

export default function AdminFlagsPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Feature flags</h1>
        <p className="text-sm text-muted-foreground">
          Turn platform capabilities on and off without a deploy.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Flag className="h-6 w-6 text-muted-foreground" />
          </span>
          <p className="text-sm font-medium text-foreground">Not built yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Nothing stores feature flags and no code reads one, so there is nothing
            to show here. This page previously displayed toggles that controlled
            nothing — they have been removed rather than left to mislead.
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Needs a <span className="font-mono">feature_flags</span> table, a read path
            the app consults, and an audit entry per change.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
