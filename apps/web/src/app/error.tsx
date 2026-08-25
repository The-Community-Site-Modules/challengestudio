'use client'

// Global error boundary — catches unhandled errors in the app
// Sentry will also capture these via @sentry/nextjs

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Sentry will auto-capture this in production
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        An unexpected error occurred. Our team has been notified.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </main>
  )
}
