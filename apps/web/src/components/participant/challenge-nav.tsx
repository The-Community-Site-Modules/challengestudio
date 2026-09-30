'use client'

/**
 * The participant's navigation: tabs across the top on a desktop, a tab bar
 * along the bottom on a phone.
 *
 * ── On the Community count ──────────────────────────────────────────────────
 *
 * It is a post count, not an unread count. Nothing records when a participant
 * last read the feed, so "unread" cannot be computed, and a badge that looks
 * like unread but is not would push people to open a feed they have already
 * seen. The accessible name says "posts" so the number cannot be misread by
 * anyone relying on it.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  Home, Map, MessageSquare, FolderOpen, Bell, User, ChevronDown, LogOut, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/app/(auth)/auth/actions'

interface NavItem {
  label: string
  short: string
  icon: typeof Home
  path: string
}

const ITEMS: NavItem[] = [
  { label: 'Today',     short: 'Today',     icon: Home,          path: '/hub' },
  { label: 'Journey',   short: 'Journey',   icon: Map,           path: '/journey' },
  { label: 'Community', short: 'Community', icon: MessageSquare, path: '/feed' },
  { label: 'Resources', short: 'Me',        icon: FolderOpen,    path: '/resources' },
]

interface Props {
  challengeSlug: string
  challengeTitle: string
  hostName: string
  /** Total posts in this challenge's feed. See the note above. */
  postCount?: number
  /** Initials for the avatar, e.g. "AK". */
  initials: string
  displayName: string
}

function isActive(pathname: string, base: string, path: string): boolean {
  if (path === '/hub') return pathname === `${base}/hub` || pathname.startsWith(`${base}/day/`)
  return pathname.startsWith(`${base}${path}`)
}

export function ChallengeNav({
  challengeSlug, challengeTitle, hostName, postCount, initials, displayName,
}: Props) {
  const pathname = usePathname()
  const base = `/c/${challengeSlug}`
  const hostInitials = hostName.slice(0, 2).toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href={`${base}/hub`} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
              {hostInitials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] text-muted-foreground">{hostName}</span>
              <span className="block truncate text-sm font-bold text-foreground">{challengeTitle}</span>
            </span>
          </Link>

          <nav aria-label="Challenge" className="ml-4 hidden items-center gap-1 md:flex">
            {ITEMS.map((item) => {
              const active = isActive(pathname, base, item.path)
              return (
                <Link
                  key={item.path}
                  href={`${base}${item.path}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-3 py-[21px] text-sm font-medium transition-colors',
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  {item.path === '/feed' && postCount !== undefined && postCount > 0 && (
                    <span
                      className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary"
                      aria-label={`${postCount} posts`}
                    >
                      {postCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/account/notifications"
              aria-label="Notification settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </Link>

            <AccountMenu initials={initials} displayName={displayName} />
          </div>
        </div>
      </header>

      {/* Bottom tab bar — phones only. `pb-safe` via env() keeps it clear of the
          home indicator on iOS, where a flush bar is half-unusable. */}
      <nav
        aria-label="Challenge"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex">
          {ITEMS.map((item) => {
            const active = isActive(pathname, base, item.path)
            const Icon = item.icon
            return (
              <li key={item.path} className="flex-1">
                <Link
                  href={`${base}${item.path}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.short}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

function AccountMenu({ initials, displayName }: { initials: string; displayName: string }) {
  const [isSigningOut, startSignOut] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {initials}
        </span>
        <span className="hidden max-w-[7rem] truncate font-medium text-foreground sm:block">
          {displayName}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/account/profile">
            <User className="mr-2 h-4 w-4" aria-hidden="true" /> Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/notifications">
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onSelect={(e) => {
            // The menu unmounts on select, and an unmounted component cannot
            // finish a transition — so the navigation has to be started before
            // the default close runs.
            e.preventDefault()
            startSignOut(() => signOutAction())
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
