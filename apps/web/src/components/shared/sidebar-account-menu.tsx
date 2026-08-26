'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { ChevronUp, LogOut, User as UserIcon, type LucideIcon } from 'lucide-react'
import { signOutAction } from '@/app/(auth)/auth/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The account card pinned to the bottom of a full-height sidebar.
 *
 * Shared by the workspace and account shells so the two cannot drift: they are
 * the same control in the same corner, and a user moving between them should
 * not notice a seam.
 */

interface Props {
  userName?: string
  userEmail?: string
  userAvatar?: string
  /** Second line under the name — the workspace, or the email. */
  subLabel?: string
  /** One extra entry above Sign out, where each shell needs its own. */
  secondaryItem?: { href: string; label: string; Icon: LucideIcon }
}

export function SidebarAccountMenu({
  userName = '', userEmail = '', userAvatar, subLabel, secondaryItem,
}: Props) {
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
    <div className="border-t border-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted">
          <Avatar className="h-9 w-9 shrink-0">
            {userAvatar && <AvatarImage src={userAvatar} alt={displayName} />}
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {displayName || 'Account'}
            </span>
            {subLabel && (
              <span className="block truncate text-xs text-muted-foreground">{subLabel}</span>
            )}
          </span>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent side="top" align="start" className="w-[215px]">
          <DropdownMenuItem asChild>
            <Link href="/account/profile">
              <UserIcon className="mr-2 h-4 w-4" /> Profile
            </Link>
          </DropdownMenuItem>
          {secondaryItem && (
            <DropdownMenuItem asChild>
              <Link href={secondaryItem.href}>
                <secondaryItem.Icon className="mr-2 h-4 w-4" /> {secondaryItem.label}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {/* preventDefault first — Radix closes the menu on select, and an
              unmounting form never gets to submit. */}
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
  )
}
