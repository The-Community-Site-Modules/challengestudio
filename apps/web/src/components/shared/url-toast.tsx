'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (message) toast.success(decodeURIComponent(message))
    if (error)   toast.error(decodeURIComponent(error))
  }, [message, error])

  return null
}
