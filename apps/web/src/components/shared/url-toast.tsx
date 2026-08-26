'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Reads ?message= and ?error= from the URL and shows toasts.
 * Drop this into any Server Component page that needs toast feedback.
 */
export function UrlToast() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error   = searchParams.get('error')
  // Strict Mode runs effects twice in development, which showed every toast
  // twice. Keying on the text means a genuinely repeated message still shows
  // again, while the double mount does not.
  const shown = useRef<string | null>(null)

  useEffect(() => {
    const key = `${message ?? ''}|${error ?? ''}`
    if (key === '|' || shown.current === key) return
    shown.current = key

    if (message) toast.success(decodeURIComponent(message))
    if (error)   toast.error(decodeURIComponent(error))
  }, [message, error])

  return null
}
