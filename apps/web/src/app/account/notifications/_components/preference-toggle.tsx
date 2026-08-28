'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { setWorkspacePreferenceAction } from '../actions'

interface Props {
  workspaceId: string
  workspaceName: string
  initiallyUnsubscribed: boolean
}

/**
 * One workspace's opt-in. The switch reads as "send me these", which is the
 * way round people expect, so it is the inverse of the stored `unsubscribed`.
 */
export function PreferenceToggle({ workspaceId, workspaceName, initiallyUnsubscribed }: Props) {
  const [subscribed, setSubscribed] = useState(!initiallyUnsubscribed)
  const [isSaving, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: boolean) {
    setSubscribed(next)          // optimistic; reverted below if it fails
    setError(null)
    start(async () => {
      const result = await setWorkspacePreferenceAction(workspaceId, !next)
      if (!result.success) {
        setSubscribed(!next)
        setError(result.error ?? 'Could not save that.')
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{workspaceName}</p>
        <p className="mt-0.5 text-[13px] text-slate-500">
          {subscribed
            ? 'Challenge updates, nudges and milestones.'
            : 'Only sign-in and registration messages.'}
        </p>
        {error && <p role="alert" className="mt-1 text-[13px] text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        <Switch
          checked={subscribed}
          onCheckedChange={change}
          disabled={isSaving}
          aria-label={`Email updates from ${workspaceName}`}
        />
      </div>
    </div>
  )
}
