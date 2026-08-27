'use client'

import { useState, useTransition } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  participantId: string
  workspaceSlug: string
  approveAction: (id: string, slug: string) => Promise<{ success: boolean; error?: string }>
  rejectAction:  (id: string, slug: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Approve or turn away one waiting registration.
 *
 * Rejection is the destructive half, so it asks once. Approving is reversible
 * enough — the person can still be removed afterwards — that a confirmation
 * step would only be in the way.
 */
export function ApprovalActions({
  participantId, workspaceSlug, approveAction, rejectAction,
}: Props) {
  const [isPending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function run(action: Props['approveAction']) {
    setError(null)
    start(async () => {
      const result = await action(participantId, workspaceSlug)
      if (!result.success && result.error) setError(result.error)
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-slate-600">Turn away?</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-red-200 px-2.5 text-[13px] text-red-700 hover:bg-red-50"
          disabled={isPending}
          onClick={() => run(rejectAction)}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, reject'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2.5 text-[13px]"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[13px] text-red-600">{error}</span>}
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1.5 bg-indigo-600 px-2.5 text-[13px] text-white hover:bg-indigo-700"
        disabled={isPending}
        onClick={() => run(approveAction)}
      >
        {isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Check className="h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 px-2.5 text-[13px] text-slate-600 hover:text-slate-900"
        disabled={isPending}
        onClick={() => setConfirming(true)}
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </Button>
    </div>
  )
}
