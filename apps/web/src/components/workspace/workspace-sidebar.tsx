'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, Users, BarChart3, Mail,
  Settings, Palette, Globe, Trophy, Radio, Gift,
  ChevronDown, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  challengeScoped?: boolean
}

const workspaceNav: NavItem[] = [
  { label: 'Dashboard',   href: '',              icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Challenges',  href: '/challenges',   icon: <Zap className="h-4 w-4" /> },
  { label: 'Branding',    href: '/branding',     icon: <Palette className="h-4 w-4" /> },
  { label: 'Team',        href: '/team',         icon: <Users className="h-4 w-4" /> },
  { label: 'Integrations',href: '/integrations', icon: <Globe className="h-4 w-4" /> },
  { label: 'Settings',    href: '/settings',     icon: <Settings className="h-4 w-4" /> },
]

const challengeNav: NavItem[] = [
  { label: 'Overview',       href: '/overview',       icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Builder',        href: '/builder',        icon: <Zap className="h-4 w-4" /> },
  { label: 'Participants',   href: '/participants',   icon: <Users className="h-4 w-4" /> },
  { label: 'Community',      href: '/community',      icon: <Radio className="h-4 w-4" /> },
  { label: 'Live Sessions',  href: '/live-sessions',  icon: <Radio className="h-4 w-4" /> },
  { label: 'Communications', href: '/communications', icon: <Mail className="h-4 w-4" /> },
  { label: 'Rewards',        href: '/rewards',        icon: <Trophy className="h-4 w-4" /> },
  { label: 'Offer',          href: '/offer',          icon: <Gift className="h-4 w-4" /> },
  { label: 'Analytics',      href: '/analytics',      icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Settings',       href: '/settings',       icon: <Settings className="h-4 w-4" /> },
]

interface WorkspaceSidebarProps {
  workspaceSlug: string
  workspaceName: string
  challengeSlug?: string
  challengeTitle?: string
}

export function WorkspaceSidebar({
  workspaceSlug,
  workspaceName,
  challengeSlug,
  challengeTitle,
}: WorkspaceSidebarProps) {
  const pathname = usePathname()
  const wsBase = `/ws/${workspaceSlug}`

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Workspace selector */}
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
            {workspaceName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{workspaceName}</p>
          <p className="text-xs text-muted-foreground">Workspace</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Workspace nav */}
        {workspaceNav.map((item) => {
          const href = wsBase + item.href
          const active = pathname === href || (item.href === '' && pathname === wsBase)
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {/* Challenge section */}
        {challengeSlug && (
          <div className="mt-4">
            <div className="mb-1 px-3">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {challengeTitle ?? 'Challenge'}
              </p>
            </div>
            {challengeNav.map((item) => {
              const href = `${wsBase}/challenges/${challengeSlug}${item.href}`
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom — create challenge */}
      <div className="border-t border-border p-3">
        <Button asChild size="sm" className="w-full">
          <Link href={`${wsBase}/challenges/new`}>
            <Plus className="h-4 w-4" />
            New Challenge
          </Link>
        </Button>
      </div>
    </aside>
  )
}
