'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, Users, BarChart3, Mail, LayoutTemplate,
  Settings, Trophy, Radio, Gift, Inbox, Briefcase,
  LucideIcon, ChevronsUpDown, Check, LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarFrame } from '@/components/shared/sidebar-frame'
import { SidebarAccountMenu } from '@/components/shared/sidebar-account-menu'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  href: string
  Icon: LucideIcon
  /** Rendered as a pill on the right — e.g. a pending-review count. */
  badge?: number
  /**
   * False when the route has no page yet. Four of these linked to segments
   * that do not exist, so the sidebar's own items answered with a 404.
   * Shown, but plainly not ready, rather than quietly broken.
   */
  built?: boolean
}

const workspaceNav: NavItem[] = [
  { label: 'Dashboard',    href: '',              Icon: LayoutDashboard },
  { label: 'Challenges',   href: '/challenges',   Icon: Zap },
  { label: 'Participants', href: '/participants', Icon: Users,          built: false },
  { label: 'Submissions',  href: '/submissions',  Icon: Inbox,          built: false },
  { label: 'Analytics',    href: '/analytics',    Icon: BarChart3,      built: false },
  { label: 'Templates',    href: '/templates',    Icon: LayoutTemplate, built: false },
]

const managementNav: NavItem[] = [
  { label: 'Workspace', href: '/branding',     Icon: Briefcase },
  { label: 'Team',      href: '/team',         Icon: Users },
  { label: 'Settings',  href: '/settings',     Icon: Settings },
]

const challengeNav: NavItem[] = [
  { label: 'Overview',       href: '/overview',       Icon: LayoutDashboard },
  { label: 'Builder',        href: '/builder',        Icon: Zap },
  { label: 'Participants',   href: '/participants',   Icon: Users },
  { label: 'Community',      href: '/community',      Icon: Radio },
  { label: 'Live Sessions',  href: '/live-sessions',  Icon: Radio },
  { label: 'Communications', href: '/communications', Icon: Mail },
  { label: 'Rewards',        href: '/rewards',        Icon: Trophy },
  { label: 'Offer',          href: '/offer',          Icon: Gift },
  { label: 'Analytics',      href: '/analytics',      Icon: BarChart3 },
  { label: 'Settings',       href: '/settings',       Icon: Settings },
]

export interface WorkspaceSidebarNavProps {
  workspaceSlug: string
  workspaceName: string
  /** Every workspace this person belongs to, for the switcher. */
  workspaces?: { id: string; name: string; slug: string }[]
  challengeSlug?: string
  challengeTitle?: string
  userName?: string
  userEmail?: string
  userAvatar?: string
  /** Pending-review count shown against Submissions. */
  submissionCount?: number
}

function NavLink({ item, base, pathname }: { item: NavItem; base: string; pathname: string }) {
  const href = `${base}${item.href}`
  const { Icon: ItemIcon } = item

  if (item.built === false) {
    return (
      <span
        aria-disabled="true"
        title={`${item.label} is not built yet`}
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/45"
      >
        <ItemIcon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground/70">
          Soon
        </span>
      </span>
    )
  }

  // Without the exact test, the empty-href Dashboard entry matches every child route.
  const active = item.href === '' ? pathname === base || pathname === `${base}/` : pathname.startsWith(href)
  const { Icon } = item

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

export function WorkspaceSidebarNav({
  workspaceSlug,
  workspaceName,
  workspaces = [],
  challengeSlug,
  challengeTitle,
  userName = '',
  userEmail = '',
  userAvatar,
  submissionCount,
}: WorkspaceSidebarNavProps) {
  const pathname = usePathname()
  const wsBase = `/ws/${workspaceSlug}`


  const primaryNav = workspaceNav.map((item) =>
    item.label === 'Submissions' && submissionCount ? { ...item, badge: submissionCount } : item
  )

  return (
    <SidebarFrame label="Workspace navigation">

      {/* Workspace switcher. This block used to be a plain label, which left
          no way out of a workspace short of editing the URL. */}
      <div className="px-3 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-indigo-400">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {workspaceName.trim().charAt(0).toUpperCase() || 'W'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
                {workspaceName}
              </span>
              <span className="block text-[11px] text-muted-foreground">Workspace</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[231px]">
            {workspaces.length > 1 && (
              <>
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Switch workspace
                </DropdownMenuLabel>
                {workspaces.map((ws) => (
                  <DropdownMenuItem key={ws.id} asChild>
                    <Link href={`/ws/${ws.slug}`}>
                      <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {ws.name.trim().charAt(0).toUpperCase() || 'W'}
                      </span>
                      <span className="truncate">{ws.name}</span>
                      {ws.slug === workspaceSlug && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <LayoutGrid className="mr-2 h-4 w-4" /> All workspaces
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.label} item={item} base={wsBase} pathname={pathname} />
          ))}
        </div>

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Management
        </p>
        <div className="space-y-0.5">
          {managementNav.map((item) => (
            <NavLink key={item.label} item={item} base={wsBase} pathname={pathname} />
          ))}
        </div>

        {challengeSlug && (
          <>
            <p className="truncate px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {challengeTitle ?? 'Challenge'}
            </p>
            <div className="space-y-0.5">
              {challengeNav.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  base={`${wsBase}/challenges/${challengeSlug}`}
                  pathname={pathname}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      <SidebarAccountMenu
        userName={userName}
        userEmail={userEmail}
        {...(userAvatar ? { userAvatar } : {})}
        subLabel={workspaceName}
        secondaryItem={{ href: `${wsBase}/settings`, label: 'Workspace settings', Icon: Settings }}
      />
    </SidebarFrame>
  )
}
