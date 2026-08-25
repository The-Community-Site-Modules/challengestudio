import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top nav */}
      <header className="flex h-14 items-center border-b border-border bg-background px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Challenge Studio</span>
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
