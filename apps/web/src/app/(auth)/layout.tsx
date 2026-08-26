import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top nav */}
      <header className="flex h-14 items-center border-b border-border bg-background px-6">
        <Link href="/" className="flex items-center">
          <Logo className="h-7" priority />
        </Link>
      </header>

      {/* Centered content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
        {' · '}
        <Link href="/legal/terms" className="hover:underline">Terms</Link>
      </footer>
    </div>
  )
}
