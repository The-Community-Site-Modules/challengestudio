'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, LayoutDashboard, Settings, LifeBuoy, Plus, FileText,
  Users, UserRoundCog, BarChart3, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarFrame } from '@/components/shared/sidebar-frame'
import { Logo } from '@/components/shared/logo'
import { SidebarAccountMenu } from '@/components/shared/sidebar-account-menu'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DropdownMenuLink } from '@/components/shared/menu-link'

/**
 * Sidebar for the global level — signed in, but not inside a workspace.
 *
 * Same shell as the workspace and account sidebars so the three read as one
 * application. What differs is scope: nothing here is workspace-specific,
 * because at this level no workspace is selected. Challenges, Participants and
 * the rest only make sense once you are in one, and they live in that sidebar.
 *
 * ── Why nothing here opens a single workspace ───────────────────────────────
 *
 * Content, Participants, Team and Analytics used to point at "the most
 * recently active workspace" with nothing on screen saying which, so every
 * click was a guess. They now have agency-wide pages of their own: the same
 * words, every workspace at once, with the workspace named on each row.
 *
 * The one exception is Create challenge, because a challenge has to be created
 * somewhere. It asks which workspace rather than picking one.
 */

export interface SidebarWorkspace {
  slug: string
  name: string
}

interface Props {
  /**
   * Every workspace this person belongs to, most recently active first. Only
   * Create challenge uses these — to ask which one.
   */
  workspaces?: readonly SidebarWorkspace[]
  /** Rendered in the sidebar's create slot — a dialog trigger from the page. */
  createSlot?: React.ReactNode
  userName?: string
  userEmail?: string
  userAvatar?: string
}

function Item({ href, label, Icon, active = false }: {
  href: string
  label: string
  Icon: LucideIcon
  active?: boolean
}) {
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
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function GlobalSidebar({
  createSlot, workspaces = [], userName, userEmail, userAvatar,
}: Props) {
  const pathname = usePathname()
  const isHere = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <SidebarFrame label="Main navigation">

      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <Logo variant="mark" className="h-9" priority />
        <span className="truncate text-[17px] font-semibold tracking-tight text-foreground">
          Challenge Studio
        </span>
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        <div className="space-y-0.5">
          {/* `?all=1` because a plain /dashboard sends anyone with a single
              workspace straight into that workspace — right as a landing rule,
              wrong for a row labelled Dashboard. */}
          <Item href="/dashboard?all=1" label="Dashboard" Icon={LayoutDashboard}
                active={isHere('/dashboard') } />
          <Item href="/dashboard/workspaces" label="Workspaces" Icon={LayoutGrid}
                active={isHere('/dashboard/workspaces')} />
        </div>

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Management
        </p>

        {/* Creating a challenge is the one thing here that cannot be done for
            the agency as a whole — a challenge lives in one workspace. So this
            asks which, rather than choosing one silently. */}
        {workspaces.length > 0 && (
          <div className="pb-1 pt-0.5">
            {workspaces.length === 1 ? (
              <Link
                href={`/ws/${workspaces[0]!.slug}/challenges/new`}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Create challenge
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <Plus className="h-4 w-4" /> Create challenge
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[231px]">
                  <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    In which workspace?
                  </DropdownMenuLabel>
                  {workspaces.map((w) => (
                    <DropdownMenuLink key={w.slug} href={`/ws/${w.slug}/challenges/new`}>
                      <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                        {w.name.trim().charAt(0).toUpperCase() || 'W'}
                      </span>
                      <span className="truncate">{w.name}</span>
                    </DropdownMenuLink>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Every row below is the agency view of that word: all workspaces at
            once, with the workspace named on each item. None of them enters a
            single workspace. */}
        <div className="space-y-0.5">
          <Item href="/dashboard/content"      label="Content"      Icon={FileText}
                active={isHere('/dashboard/content')} />
          <Item href="/dashboard/participants" label="Participants" Icon={Users}
                active={isHere('/dashboard/participants')} />
          <Item href="/dashboard/team"         label="Team"         Icon={UserRoundCog}
                active={isHere('/dashboard/team')} />
        </div>

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Insights
        </p>
        <div className="space-y-0.5">
          <Item href="/dashboard/analytics" label="Analytics" Icon={BarChart3}
                active={isHere('/dashboard/analytics')} />
        </div>

        {createSlot && <div className="px-1 pt-2">{createSlot}</div>}

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          System
        </p>
        <div className="space-y-0.5">
          <Item href="/account/profile" label="Settings" Icon={Settings}
                active={isHere('/account')} />
        </div>
      </nav>

      <div className="px-3 pb-1">
        <a
          href="mailto:support@mychallengestudio.com"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LifeBuoy className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">Help Center</span>
        </a>
      </div>

      <SidebarAccountMenu
        {...(userName  ? { userName }  : {})}
        {...(userEmail ? { userEmail } : {})}
        {...(userAvatar ? { userAvatar } : {})}
        {...(userEmail ? { subLabel: userEmail } : {})}
      />
    </SidebarFrame>
  )
}

/** The create trigger styled as a sidebar row, for the createSlot. */
export function SidebarCreateRow({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border border-dashed border-border">
        <Plus className="h-3 w-3" />
      </span>
      <span className="truncate">New workspace</span>
    </button>
  )
}
