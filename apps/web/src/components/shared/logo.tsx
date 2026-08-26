import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * The product logo.
 *
 * Five places drew their own lockup — a Zap glyph in a coloured square next to
 * the words — so the brand was five copies that could drift apart. This is the
 * one implementation.
 *
 * Three forms, because one does not survive every size. The artwork stacks
 * "My" over "Challenge" over "Studio", so below roughly 40px tall its words
 * stop being readable — measured in the browser, not assumed.
 *
 *   `full`    the artwork itself. Use at h-10 or larger.
 *   `lockup`  the roundel beside the name set in type. For compact chrome —
 *             a 56px header leaves no room for the artwork to be legible.
 *   `mark`    the roundel alone.
 *
 * Set the height with a class; the width follows the aspect ratio.
 *
 * The artwork is navy and reads on light surfaces only, which is every surface
 * the app currently has. A dark variant would need new artwork, not a filter.
 */

const ART = {
  full: { src: '/logo.png',      width: 1659, height: 552 },
  mark: { src: '/logo-mark.png', width:  586, height: 586 },
} as const

interface LogoProps {
  variant?: keyof typeof ART | 'lockup'
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
  if (variant === 'lockup') {
    return (
      <span className="flex items-center gap-2.5">
        <Image
          src={ART.mark.src}
          alt=""
          width={ART.mark.width}
          height={ART.mark.height}
          priority={priority}
          sizes="64px"
          className={cn('w-auto object-contain', className)}
        />
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-slate-900">
          Challenge Studio
        </span>
      </span>
    )
  }

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
