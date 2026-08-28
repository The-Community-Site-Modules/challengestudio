'use client'

/**
 * The sticky category bar on the features page.
 *
 * Thirteen categories is more than fits a screen, so this does three things a
 * plain row of anchors would not:
 *
 *   - highlights the section you are actually looking at, using an
 *     IntersectionObserver rather than scroll maths, so it stays accurate
 *     while the browser is doing smooth scrolling;
 *   - scrolls the active chip into view horizontally, so on a phone the bar
 *     keeps up with the page instead of being left behind at "Builder";
 *   - fades the ends of the strip when there is more to either side, because
 *     a horizontal scroller with no visible edge looks like a truncated list.
 *
 * The observer watches a thin band just below the two sticky bars, and where
 * two sections both touch it — which happens at every boundary — the lower one
 * wins. Taking the upper one instead highlights the section you have just
 * finished reading, which is how the first version of this was wrong.
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  label: string
}

export function FeatureNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')
  const [edges, setEdges] = useState({ start: false, end: true })
  const stripRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  // Which section is in view.
  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        // At a boundary both the outgoing and incoming section touch the band.
        // Sorting by top descending takes the lower one — the one being
        // scrolled into rather than out of.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Top offset clears the site header (64px) and this bar; the large
      // bottom offset keeps the band thin so it cannot span three sections.
      { rootMargin: '-124px 0px -74% 0px', threshold: 0 }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [items])

  // Keep the active chip visible in the strip.
  useEffect(() => {
    const chip = chipRefs.current[active]
    const strip = stripRef.current
    if (!chip || !strip) return

    const chipBox = chip.getBoundingClientRect()
    const stripBox = strip.getBoundingClientRect()
    if (chipBox.left < stripBox.left + 24 || chipBox.right > stripBox.right - 24) {
      strip.scrollTo({
        left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2,
        behavior: 'smooth',
      })
    }
  }, [active])

  // Whether there is more strip off either end.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = strip
      setEdges({
        start: scrollLeft > 8,
        end: scrollLeft + clientWidth < scrollWidth - 8,
      })
    }
    update()
    strip.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      strip.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="relative mx-auto max-w-7xl px-6">
        {/* Edge fades — decorative, and they must not eat clicks. */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 left-6 z-10 w-10 bg-gradient-to-r from-background to-transparent transition-opacity',
            edges.start ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 right-6 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity',
            edges.end ? 'opacity-100' : 'opacity-0'
          )}
        />

        <nav aria-label="Feature categories">
          <div
            ref={stripRef}
            className="flex gap-1 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => {
              const isActive = active === item.id
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  ref={(el) => { chipRefs.current[item.id] = el }}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </a>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
