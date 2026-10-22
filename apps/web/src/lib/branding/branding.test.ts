import { describe, it, expect } from 'vitest'
import {
  isHexColor, hexToHslTriplet, foregroundFor, themeStyle,
  safeSenderName, safeHttpsUrl, safeEmail,
} from './index'

describe('colours', () => {
  it('accepts only #RRGGBB', () => {
    expect(isHexColor('#4f46e5')).toBe(true)
    expect(isHexColor('#4F46E5')).toBe(true)
    for (const bad of ['4f46e5', '#fff', '#4f46e5ff', 'red', '#4f46e5; background:url(x)', '', null, undefined]) {
      expect(isHexColor(bad)).toBe(false)
    }
  })

  it('converts to the triplet the theme variables use', () => {
    // The platform's own primary, as it appears in globals.css.
    expect(hexToHslTriplet('#4f46e5')).toBe('243.4 75.4% 58.6%')
    expect(hexToHslTriplet('#000000')).toBe('0 0% 0%')
    expect(hexToHslTriplet('#ffffff')).toBe('0 0% 100%')
  })

  it('puts dark text on a pale colour and white text on a dark one', () => {
    expect(foregroundFor('#fde047')).toBe('#0f172a') // pale yellow
    expect(foregroundFor('#4f46e5')).toBe('#ffffff') // indigo
    expect(foregroundFor('#ffffff')).toBe('#0f172a')
  })

  it('sets no variables when nothing is chosen, so the platform palette stays', () => {
    expect(themeStyle(null, null)).toBeUndefined()
    expect(themeStyle('not a colour', 'nor this')).toBeUndefined()
  })

  it('never lets a non-colour into the style', () => {
    const style = themeStyle('#123456; color: red', '#00ff00') as Record<string, string>
    expect(style['--primary']).toBeUndefined()
    expect(style['--brand-accent']).toBe(hexToHslTriplet('#00ff00'))
  })
})

describe('sender name', () => {
  it('removes line breaks, which would add headers', () => {
    expect(safeSenderName('Acme\r\nBcc: victim@example.com')).toBe('Acme Bcc: victim@example.com')
  })

  it('removes the characters that delimit an address', () => {
    expect(safeSenderName('Support <admin@bank.example>')).toBe('Support admin@bank.example')
    expect(safeSenderName('"Quoted" Name')).toBe('Quoted Name')
  })

  it('falls back when nothing usable is left', () => {
    expect(safeSenderName('  <> "" ')).toBeNull()
    expect(safeSenderName('')).toBeNull()
    expect(safeSenderName(null)).toBeNull()
  })

  it('caps the length', () => {
    expect(safeSenderName('x'.repeat(200))).toHaveLength(60)
  })
})

describe('links and addresses', () => {
  it('keeps only https links', () => {
    expect(safeHttpsUrl('https://acme.example/privacy')).toBe('https://acme.example/privacy')
    for (const bad of ['http://acme.example', 'javascript:alert(1)', 'acme.example/privacy', '', null]) {
      expect(safeHttpsUrl(bad)).toBeNull()
    }
  })

  it('keeps only a plain address', () => {
    expect(safeEmail(' Help@Acme.Example ')).toBe('help@acme.example')
    for (const bad of ['Acme <help@acme.example>', 'help@acme', 'a@b.c, d@e.f', 'no at sign', '', null]) {
      expect(safeEmail(bad)).toBeNull()
    }
  })
})
