'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  workspaceId:    string
  workspaceSlug:  string
  deleteAction:   (workspaceId: string) => Promise<void>
}

export function DeleteWorkspace({ workspaceId, workspaceSlug, deleteAction }: Props) {
  const [confirm,    setConfirm]    = useState('')
  const [isPending,  startTransition] = useTransition()

  const isMatch = confirm === workspaceSlug

  function handleDelete() {
    if (!isMatch) return
    startTransition(() => deleteAction(workspaceId))
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </div>
        <CardDescription>
          These actions are irreversible. Proceed with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Export */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Export workspace data</p>
            <p className="text-xs text-muted-foreground">
              Download all participant and challenge data as CSV.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Export (coming soon)
          </Button>
        </div>

        {/* Delete */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Delete workspace</p>
            <p className="text-xs text-muted-foreground">
              Permanently deletes this workspace and{' '}
              <strong>all challenges, participants, and data</strong>.
              This cannot be undone.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Type{' '}
              <span className="font-mono font-bold text-foreground">{workspaceSlug}</span>
              {' '}to confirm
            </Label>
            <Input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={workspaceSlug}
              className="max-w-xs"
              disabled={isPending}
            />
          </div>

          <Button
            variant="destructive"
            size="sm"
            disabled={!isMatch || isPending}
            onClick={handleDelete}
            className="gap-2"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
              : <><Trash2 className="h-3.5 w-3.5" /> Delete workspace permanently</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
