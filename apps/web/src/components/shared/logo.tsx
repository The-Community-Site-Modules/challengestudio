import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The product logo.
 *
 * Five places drew their own lockup — a Zap glyph in a coloured square next to
 * the words — so the brand was five copies that could drift apart. This is the
 * one implementation.
 *
 * `full` is the horizontal lockup (mark + wordmark). `mark` is just the summit
 * roundel, for places too narrow for the words. Set the height with a class
 * (`h-8`); the width follows the aspect ratio.
 *
 * The artwork is navy and reads on light surfaces only, which is every surface
 * the app currently has. A dark variant would need new artwork, not a filter.
 */

const ART = {
  full: { src: '/logo.png',      width: 1659, height: 552 },
  mark: { src: '/logo-mark.png', width:  586, height: 586 },
} as const

interface LogoProps {
  variant?: keyof typeof ART
  className?: string
  /** Set on above-the-fold headers so the logo is not lazy-loaded into a gap. */
  priority?: boolean
  /**
   * Rendered width, for picking a source. Without it Next assumes the layout
   * width is the intrinsic 1659px and ships a 3840px file for a 96px logo.
   */
  sizes?: string
}

export function Logo({ variant = 'full', className, priority = false, sizes = '200px' }: LogoProps) {
  const art = ART[variant]
  return (
    <Image
      src={art.src}
      alt="My Challenge Studio"
      width={art.width}
      height={art.height}
      priority={priority}
      sizes={sizes}
      className={cn('w-auto object-contain', className)}
    />
  )
}
