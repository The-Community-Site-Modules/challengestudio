'use client'

/**
 * A dropdown-menu row that navigates.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * `<DropdownMenuItem asChild><Link …></DropdownMenuItem>` reads as the obvious
 * way to put a link in a menu, and it renders a perfectly good anchor with a
 * correct href. It just does not navigate.
 *
 * Radix closes the menu when an item is selected, and closing unmounts the
 * anchor. On a real pointer that happens between `pointerup` and `click`, so
 * the `click` the browser would have turned into a navigation is dispatched at
 * an element that is no longer in the document. Nothing throws, nothing logs:
 * the menu shuts and the page stays where it was. That was the workspace
 * switcher's behaviour — the one control whose whole purpose is to leave the
 * page you are on.
 *
 * `onSelect` fires before the close, so the navigation is pushed from there
 * and the dead click no longer matters. The anchor and its `href` stay, which
 * is what keeps middle-click, ⌘-click, "copy link address" and a crawler
 * working — those never relied on the React handler.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Props {
  href: string
  children: React.ReactNode
  /** Passed through to the anchor; `false` keeps the page from jumping. */
  scroll?: boolean
  /** `_blank` opens a new tab — `rel="noopener noreferrer"` is then implied. */
  target?: string
  className?: string
}

export function DropdownMenuLink({ href, children, scroll, target, className }: Props) {
  const router = useRouter()
  const newTab = target === '_blank'

  return (
    <DropdownMenuItem
      asChild
      onSelect={(event) => {
        // Take the navigation off the anchor's click and do it here, while the
        // menu is still mounted.
        event.preventDefault()
        if (newTab) {
          // `noopener` matters as much here as in the markup: without it the
          // opened page gets a handle on this one through `window.opener`.
          window.open(href, '_blank', 'noopener,noreferrer')
          return
        }
        router.push(href, ...(scroll === false ? [{ scroll: false }] : []))
      }}
    >
      <Link
        href={href}
        {...(scroll !== undefined ? { scroll } : {})}
        {...(target ? { target, rel: 'noopener noreferrer' } : {})}
        className={className}
      >
        {children}
      </Link>
    </DropdownMenuItem>
  )
}
