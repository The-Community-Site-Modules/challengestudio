import { AdminSidebar } from '@/components/admin/admin-sidebar'

// Platform admin layout — accessible to platform owner only
// Route protection enforced in middleware (Milestone 15)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  )
}
