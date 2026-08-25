'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, List, MessageSquare, Trophy, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChallengeNavProps {
  challengeSlug: string
  challengeTitle: string
  hostName: string
}

const navItems = [
  { label: 'Hub',         icon: Home,          href: '/hub' },
  { label: 'Days',        icon: List,          href: '/day/' },  // matches any /day/N
  { label: 'Community',   icon: MessageSquare, href: '/feed' },
  { label: 'Leaderboard', icon: Trophy,        href: '/leaderboard' },
]

export function ChallengeNav({ challengeSlug, challengeTitle, hostName }: ChallengeNavProps) {
  const pathname = usePathname()
  const base = `/c/${challengeSlug}`

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-foreground leading-none">{challengeTitle}</p>
              <p className="text-xs text-muted-foreground">by {hostName}</p>
            </div>
          </div>

          {/* Mobile-friendly tab nav */}
          <nav className="flex items-center gap-0.5">
            {navItems.map((item) => {
              // For "Days" item: navigate to day/1 but match active on any /day/ route
              const navHref   = item.href === '/day/' ? `${base}/day/1` : `${base}${item.href}`
              const matchBase = `${base}${item.href}`
              const active    = pathname.startsWith(matchBase)
              return (
                <Link
                  key={item.label}
                  href={navHref}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden text-[10px] font-medium sm:block">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
    </>
  )
}
