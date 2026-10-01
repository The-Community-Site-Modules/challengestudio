/**
 * The footer for every public page.
 *
 * It used to live inline in the homepage and only there, so /features,
 * /pricing, /use-cases and — worst of the five — /legal/privacy and
 * /legal/terms had no footer at all. The only links to the privacy policy and
 * the terms were on the one page that already carried them, which meant a
 * visitor who landed anywhere else had no route to either.
 *
 * Rendered by the marketing layout, so a new page under `(marketing)` gets it
 * without anyone remembering to add it.
 */

import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Use cases', href: '/use-cases' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { label: 'Create an account', href: '/auth/signup' },
      { label: 'Sign in', href: '/auth/login' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo className="h-10" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Build a challenge. Guide a transformation. Turn participation into
              momentum, community, and measurable results.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-7 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 Smartstack Platforms LLC. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Challenge Studio is in beta.</p>
        </div>
      </div>
    </footer>
  )
}
