'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { UserRound, AtSign, ShieldCheck, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarFrame } from '@/components/shared/sidebar-frame'
import { Logo } from '@/components/shared/logo'
import { SidebarAccountMenu } from '@/components/shared/sidebar-account-menu'

/**
 * Account sidebar.
 *
 * Deliberately the same shell as the workspace sidebar — same width, same
 * surface, same account card in the same corner — so moving between a
 * workspace and your own settings is not a jolt.
 *
 * The difference is what the items point at. Workspace items are routes;
 * settings is one page, so these move within it. The rail follows the reader:
 * whichever section is nearest the top of the viewport is the active one, which
 * keeps it honest when someone scrolls instead of clicking.
 *
 * Only three sections, because only three exist. /account/notifications and
 * /account/challenges are still milestone stubs, and an item leading to a page
 * that says "Milestone 13" is worse than no item.
 */

const SECTIONS = [
  { id: 'profile',  label: 'Profile',  Icon: UserRound  },
  { id: 'account',  label: 'Account',  Icon: AtSign     },
  { id: 'security', label: 'Security', Icon: ShieldCheck },
] as const

interface Props {
  userName?: string
  userEmail?: string
  userAvatar?: string
}

export function SettingsNav({ userName, userEmail, userAvatar }: Props) {
  const [active, setActive] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    const targets = SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (targets.length === 0) return

    // rootMargin pulls the trigger line down from the top so a section counts
    // as "current" once it is comfortably in view, not as its first pixel is.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 }
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id)
    if (!target) return          // let the browser handle the anchor normally
    e.preventDefault()
    setActive(id)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Move keyboard focus too, or the rail serves sighted users only.
    target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }

  return (
    <SidebarFrame label="Settings navigation">

      {/* Brand — the workspace sidebar puts the workspace here; outside a
          workspace the product is what you are in. */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <Logo variant="mark" className="h-9" priority />
        <span className="truncate text-[17px] font-semibold tracking-tight text-foreground">
          Challenge Studio
        </span>
      </Link>

      <nav aria-label="Settings sections" className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
        <div className="space-y-0.5">
          {SECTIONS.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => go(e, id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{label}</span>
              </a>
            )
          })}
        </div>

        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </p>
        <div className="space-y-0.5">
          {/* There is no top bar in this shell, so without this the way back is
              the browser button. */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">Dashboard</span>
          </Link>
        </div>
      </nav>

      <SidebarAccountMenu
        {...(userName  ? { userName }  : {})}
        {...(userEmail ? { userEmail } : {})}
        {...(userAvatar ? { userAvatar } : {})}
        {...(userEmail ? { subLabel: userEmail } : {})}
      />
    </SidebarFrame>
  )
}
