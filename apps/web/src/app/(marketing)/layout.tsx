import { MarketingNav } from '@/components/shared/marketing-nav'
import { MarketingFooter } from '@/components/shared/marketing-footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      {/* Here rather than per page: only the homepage ever remembered to render
          one, which left the legal pages — the two that most need a route back
          to each other — with no footer at all. */}
      <MarketingFooter />
    </div>
  )
}
