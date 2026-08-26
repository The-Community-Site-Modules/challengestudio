'use client'

import { useState, useRef, useEffect } from 'react'
import { Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Hands the invite URL to whoever is managing the team.
 *
 * Without this the token only ever reaches someone by email, so an invitation
 * is unusable whenever mail is not configured or lands in spam — the row exists
 * and there is no way to act on it. Copying the link covers both.
 *
 * The token is safe to show here: the team page is already gated on
 * workspace.team.manage, and the link is meant to be handed to the invitee.
 */
export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Built on the client so the link matches whatever host this is served from —
  // localhost in development, the real domain in production — instead of
  // depending on NEXT_PUBLIC_APP_URL being right in every environment.
  const url = () => `${window.location.origin}/auth/invitation/${token}`

  async function handleCopy() {
    const value = url()
    try {
      // Absent on http:// origins other than localhost, and blocked when the
      // document is not focused. Fall through to letting them copy by hand.
      await navigator.clipboard.writeText(value)
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setFallback(value)
    }
  }

  useEffect(() => {
    if (fallback) inputRef.current?.select()
  }, [fallback])

  if (fallback) {
    return (
      <input
        ref={inputRef}
        readOnly
        value={fallback}
        aria-label="Invitation link — copy this"
        onFocus={(e) => e.currentTarget.select()}
        className="h-8 w-48 rounded-md border border-input bg-muted px-2 font-mono text-xs text-foreground"
      />
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 shrink-0 gap-1.5"
      title="Copy the invitation link"
    >
      {copied
        ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
        : <><Link2 className="h-3.5 w-3.5" /> Copy link</>}
    </Button>
  )
}
