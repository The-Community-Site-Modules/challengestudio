/**
 * Turning a workspace's branding into things a page and an email can use.
 *
 * Pure functions, no database, no React — so the rules that keep a creator's
 * input from breaking someone else's page or someone's inbox can be tested
 * without either.
 *
 * Two of these are guards rather than conveniences:
 *
 * - Colours go into a `style` attribute. A value that is not exactly
 *   `#RRGGBB` is refused, so nothing but a colour ever reaches CSS.
 * - The sender name goes into an email's From header. A newline there would let
 *   whoever set it add headers of their own, so line breaks and the characters
 *   that delimit an address are removed.
 */

import type { CSSProperties } from 'react'

const HEX = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX.test(value)
}

/** `#4f46e5` → `243.4 75.4% 58.6%`, the shape the theme variables hold. */
export function hexToHslTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }

  const round = (n: number) => Math.round(n * 10) / 10
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * White or near-black text on a brand colour — whichever reads better.
 *
 * A creator picking a pale yellow would otherwise get white button labels
 * nobody can read. The choice is made here, from the colour, rather than
 * asked of someone who has just chosen a colour and not a text colour.
 */
export function foregroundFor(hex: string): '#ffffff' | '#0f172a' {
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#0f172a') ? '#ffffff' : '#0f172a'
}

/**
 * CSS variables that re-colour everything below them.
 *
 * The participant pages are styled with `bg-primary`, `text-primary` and
 * `ring`, which read these variables — so setting them on one wrapper themes
 * every page under /c/<slug> without touching any of them. Unset colours leave
 * the platform's own palette in place.
 */
export function themeStyle(
  primary: string | null | undefined,
  accent: string | null | undefined
): CSSProperties | undefined {
  const vars: Record<string, string> = {}
  if (isHexColor(primary)) {
    vars['--primary'] = hexToHslTriplet(primary)
    vars['--primary-foreground'] = hexToHslTriplet(foregroundFor(primary))
    vars['--ring'] = hexToHslTriplet(primary)
  }
  if (isHexColor(accent)) {
    vars['--brand-accent'] = hexToHslTriplet(accent)
  }
  return Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined
}

/**
 * A display name safe to put in a From header.
 *
 * Removes line breaks (header injection), and `<`, `>` and `"` (which would
 * let the name masquerade as an address or close the quoted name early).
 * Returns null when nothing usable is left, so the platform name is used.
 */
export function safeSenderName(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = name.replace(/[\r\n\t]+/g, ' ').replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned.slice(0, 60) : null
}

/** An absolute https:// address, or null. Anything else is not a link we emit. */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/

/** A plain address, or null. No display names, no lists. */
export function safeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  return EMAIL.test(trimmed) && trimmed.length <= 254 ? trimmed : null
}
