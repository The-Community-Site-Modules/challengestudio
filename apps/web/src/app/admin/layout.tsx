import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { requirePlatformAdmin } from '@/lib/auth/session'

// Platform admin layout — platform owner only.
//
// Middleware gates /admin as the outer check, but middleware can be bypassed
// by anything that does not run it (a rewrite, a route added outside the
// matcher). This server-side check is the authoritative one and runs for every
// page rendered under /admin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin()

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  )
}
