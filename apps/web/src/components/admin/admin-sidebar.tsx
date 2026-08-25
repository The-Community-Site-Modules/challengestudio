'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Zap,
  Flag, HeadphonesIcon, ClipboardList, Activity, Zap as Logo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Overview',    href: '/admin',            icon: LayoutDashboard },
  { label: 'Workspaces',  href: '/admin/workspaces', icon: Building2 },
  { label: 'Users',       href: '/admin/users',      icon: Users },
  { label: 'Challenges',  href: '/admin/challenges', icon: Zap },
  { label: 'Feature Flags',href: '/admin/flags',     icon: Flag },
  { label: 'Support',     href: '/admin/support',    icon: HeadphonesIcon },
  { label: 'Audit Log',   href: '/admin/audit',      icon: ClipboardList },
  { label: 'System',      href: '/admin/system',     icon: Activity },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Logo className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Challenge Studio</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Platform Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          ← Back to workspace
        </Link>
      </div>
    </aside>
  )
}
