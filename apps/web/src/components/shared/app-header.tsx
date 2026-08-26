'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Bell, HelpCircle, LogOut, User, Settings } from 'lucide-react'
import { signOutAction } from '@/app/(auth)/auth/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Logo } from '@/components/shared/logo'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  /** Shown after the product name, e.g. "Workspaces". */
  sectionLabel?: string
  userName?: string
  userEmail?: string
  userAvatar?: string
}

/**
 * Application bar for pages that sit outside a workspace — the picker and the
 * account pages, which have no sidebar to carry the brand or the account menu.
 */
export function AppHeader({ sectionLabel, userName = '', userEmail = '', userAvatar }: Props) {
  const [isSigningOut, startSignOut] = useTransition()

  const displayName = userName || userEmail
  const initials = (displayName || '?')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 lg:px-8">
      <Link href="/dashboard" className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
        <Logo variant="lockup" className="h-7" priority />
      </Link>

      {/* Dropped on narrow screens — the page heading says the same thing, and
          keeping it here squeezes the brand onto two lines. */}
      {sectionLabel && (
        <span className="hidden items-center sm:flex">
          <span aria-hidden="true" className="mx-3 h-4 w-px bg-slate-200" />
          <span className="whitespace-nowrap text-[15px] text-slate-500">{sectionLabel}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Help"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            <Avatar className="h-8 w-8">
              {userAvatar && <AvatarImage src={userAvatar} alt={displayName} />}
              <AvatarFallback className="bg-indigo-600 text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="truncate font-medium">{displayName || 'Account'}</p>
              {userEmail && (
                <p className="truncate text-xs font-normal text-muted-foreground">{userEmail}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account/profile">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/notifications">
                <Settings className="mr-2 h-4 w-4" /> Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* preventDefault first — Radix closes the menu on select, and a
                form that unmounts never gets to submit. */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault()
                startSignOut(() => signOutAction())
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
