'use client'

/**
 * Post to the challenge feed without leaving the hub.
 *
 * It reuses `createPostAction`, so everything that guards the feed guards this
 * too — enrolment, the rate limit, the length cap. Duplicating any of that here
 * would mean two places to keep in step and one of them eventually wrong.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createPostAction } from '../../feed/actions'

export function HubComposer({ challengeSlug }: { challengeSlug: string }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPosting, startPosting] = useTransition()
  const router = useRouter()

  function submit() {
    const text = body.trim()
    if (!text) return

    startPosting(async () => {
      const result = await createPostAction(challengeSlug, text)
      if (result.success) {
        setBody('')
        setError(null)
        // The posts above are server-rendered, so the new one only appears
        // once this route's data is fetched again.
        router.refresh()
      } else {
        setError(result.error ?? 'That did not post. Try again.')
      }
    })
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2">
        <label htmlFor="hub-post" className="sr-only">
          Share something with the group
        </label>
        <input
          id="hub-post"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Share one line with the group…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button size="sm" onClick={submit} disabled={isPosting || !body.trim()}>
          {isPosting ? 'Posting…' : 'Post'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
