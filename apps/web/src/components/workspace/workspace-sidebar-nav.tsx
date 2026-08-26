'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, Users, BarChart3, Mail, LayoutTemplate,
  Settings, Trophy, Radio, Gift, Inbox, Briefcase,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarAccountMenu } from '@/components/shared/sidebar-account-menu'

interface NavItem {
  label: string
  href: string
  Icon: LucideIcon
  /** Rendered as a pill on the right — e.g. a pending-review count. */
  badge?: number
}

const workspaceNav: NavItem[] = [
  { label: 'Dashboard',    href: '',              Icon: LayoutDashboard },
  { label: 'Challenges',   href: '/challenges',   Icon: Zap },
  { label: 'Participants', href: '/participants', Icon: Users },
  { label: 'Submissions',  href: '/submissions',  Icon: Inbox },
  { label: 'Analytics',    href: '/analytics',    Icon: BarChart3 },
  { label: 'Templates',    href: '/templates',    Icon: LayoutTemplate },
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
    <aside className="flex h-full w-[255px] shrink-0 flex-col border-r border-border bg-card">

      {/* Workspace mark */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {workspaceName.trim().charAt(0).toUpperCase() || 'W'}
        </div>
        <span className="truncate text-[17px] font-semibold tracking-tight text-foreground">
          {workspaceName}
        </span>
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
    </aside>
  )
}
