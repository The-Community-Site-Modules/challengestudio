'use client'

import Link from 'next/link'
import {
  LayoutGrid, LayoutDashboard, Settings, LifeBuoy, Plus, Zap, FileText,
  Users, UserRoundCog, BarChart3, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarFrame } from '@/components/shared/sidebar-frame'
import { Logo } from '@/components/shared/logo'
import { SidebarAccountMenu } from '@/components/shared/sidebar-account-menu'

/**
 * Sidebar for the global level — signed in, but not inside a workspace.
 *
 * Same shell as the workspace and account sidebars so the three read as one
 * application. What differs is scope: nothing here is workspace-specific,
 * because at this level no workspace is selected. Challenges, Participants and
 * the rest only make sense once you are in one, and they live in that sidebar.
 *
 * The workspace list doubles as the switcher: this is the one screen where
 * every workspace is one click away.
 */

interface WorkspaceLink {
  id: string
  name: string
  slug: string
}

interface Props {
  workspaces: WorkspaceLink[]
  /**
   * Where the workspace-level items point: the most recently active workspace.
   * Challenges, Content and the rest are workspace concepts, so without one
   * there is nowhere for them to go and they are left out.
   */
  primarySlug?: string
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
  workspaces, createSlot, primarySlug, userName, userEmail, userAvatar,
}: Props) {
  const ws = primarySlug ? `/ws/${primarySlug}` : null

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

      {ws && (
        <div className="px-3 pb-1">
          <Link
            href={`${ws}/challenges/new`}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Create challenge
          </Link>
        </div>
      )}

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        <div className="space-y-0.5">
          {ws && <Item href={ws} label="Dashboard" Icon={LayoutDashboard} />}
          <Item href="/dashboard" label="Workspaces" Icon={LayoutGrid} active />
        </div>

        {/* Workspace concepts, pointed at the workspace you were last in. They
            are hidden entirely when you have none, rather than linking nowhere. */}
        {ws && (
          <>
            <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Management
            </p>
            <div className="space-y-0.5">
              <Item href={`${ws}/challenges`}   label="Challenges"   Icon={Zap} />
              <Item href={`${ws}/content`}      label="Content"      Icon={FileText} />
              <Item href={`${ws}/participants`} label="Participants" Icon={Users} />
              <Item href={`${ws}/team`}         label="Team"         Icon={UserRoundCog} />
            </div>

            <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Insights
            </p>
            <div className="space-y-0.5">
              <Item href={`${ws}/analytics`} label="Analytics" Icon={BarChart3} />
            </div>
          </>
        )}

        {workspaces.length > 0 && (
          <>
            <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your workspaces
            </p>
            <div className="space-y-0.5">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/ws/${ws.slug}`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                    {ws.name.trim().charAt(0).toUpperCase() || 'W'}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {createSlot && <div className="px-1 pt-2">{createSlot}</div>}

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          System
        </p>
        <div className="space-y-0.5">
          <Item href="/account/profile" label="Settings" Icon={Settings} />
        </div>
      </nav>

      <div className="px-3 pb-1">
        <a
          href="mailto:support@challengestudio.app"
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
