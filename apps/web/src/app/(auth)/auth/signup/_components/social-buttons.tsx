/**
 * Social sign-in — the visual slot, held open, and honestly empty.
 *
 * No provider is configured in Supabase, so these buttons cannot do anything.
 * They are rendered `disabled` with the reason on the label rather than as
 * live-looking buttons that fail silently: a person who clicks "Continue with
 * Google" and gets nothing concludes the product is broken, and they are not
 * wrong.
 *
 * Turning them on later is a Supabase provider setting plus a call to
 * `signInWithOAuth` — the layout below does not change.
 */

import { cn } from '@/lib/utils'

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.1-4 1.1-3 0-5.6-2-6.6-4.8h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.4 6.9 9 4.8 12 4.8Z" />
    </svg>
  )
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  )
}

const PROVIDERS = [
  { name: 'Google', Mark: GoogleMark },
  { name: 'Microsoft', Mark: MicrosoftMark },
]

export function SocialButtons({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid gap-2 sm:grid-cols-2">
        {PROVIDERS.map(({ name, Mark }) => (
          <button
            key={name}
            type="button"
            disabled
            className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Mark className="h-4 w-4 shrink-0" />
            Continue with {name}
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Social sign-in is coming — use your email for now.
      </p>
    </div>
  )
}
