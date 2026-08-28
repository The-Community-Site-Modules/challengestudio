import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

/**
 * The centred-card chrome the auth pages used to get from the layout.
 *
 * It moved out of `layout.tsx` so that one page — sign-up — can use the full
 * width for a split screen. A layout cannot tell which child it is rendering,
 * so the choice has to belong to the page.
 *
 * Every auth page except sign-up wraps itself in this and looks exactly as it
 * did before.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center border-b border-border bg-background px-6">
        <Link href="/" className="flex items-center">
          <Logo variant="lockup" className="h-7" priority />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <footer className="py-4 text-center text-xs text-muted-foreground">
        <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
        {' · '}
        <Link href="/legal/terms" className="hover:underline">Terms</Link>
      </footer>
    </div>
  )
}
