'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Bell, HelpCircle, LogOut, User, Settings } from 'lucide-react'
import { signOutAction } from '@/app/(auth)/auth/actions'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WorkspaceHeaderProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  pageTitle?: string
  /**
   * Show the product logo on the left. The workspace shell carries branding in
   * its sidebar; the account pages have no sidebar, so without this their
   * header starts empty.
   */
  brand?: boolean
}

export function WorkspaceHeader({
  userName = 'User',
  userEmail = '',
  userAvatar,
  pageTitle,
  brand = false,
}: WorkspaceHeaderProps) {
  const [isSigningOut, startSignOut] = useTransition()

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      {brand && (
        <Link href="/dashboard" className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <Logo variant="lockup" className="h-7" priority />
        </Link>
      )}
      {pageTitle && (
        <p className="text-sm font-medium text-muted-foreground">{pageTitle}</p>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* asChild so the item renders as the link itself — a DropdownMenuItem
                wrapping a Link swallows keyboard activation. */}
            <DropdownMenuItem asChild>
              <Link href="/account/profile">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/notifications">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* preventDefault, then run the action: Radix closes the menu on
                select, and an unmounting form never gets to submit. The menu
                needs JS to open at all, so there is nothing to progressively
                enhance here. */}
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
