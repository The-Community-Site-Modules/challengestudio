import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { requirePlatformAdmin } from '@/lib/auth/session'

// Platform admin layout — platform owner only.
//
// Middleware gates /admin as the outer check, but middleware can be bypassed
// by anything that does not run it (a rewrite, a route added outside the
// matcher). This server-side check is the authoritative one and runs for every
// page rendered under /admin.
//
// The shell is exactly one viewport tall and does not scroll. Scrolling belongs
// to the two panes: the nav, and the page's own <main>. With a growing
// min-h-screen wrapper instead, the sidebar scrolled up out of view along with
// the content.
//
// `relative` matters: Tailwind's .sr-only is position:absolute, and with no
// positioned ancestor it resolves against the initial containing block. Inside
// a scrolled pane its static position can sit far below the fold, which grows
// the document and gives the page a stray scrollbar behind the fixed sidebar.
// Anchoring here contains every absolute descendant that has no nearer one.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin()

  return (
    <div className="relative flex h-screen overflow-hidden bg-muted/20">
      <AdminSidebar />
      {/* min-w-0 so a wide table inside scrolls itself instead of pushing the
          sidebar off-screen. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
