/**
 * Password strength scoring.
 *
 * The meter is advice, but the `valid` flag is a gate — the form will not
 * submit without it — so it is worth the tests. The case that matters most is
 * the one a naive scorer gets wrong: a short password that ticks the optional
 * boxes must still read as weak, because it is going to be refused.
 */

import { describe, it, expect } from 'vitest'
import { scorePassword } from './password-strength'

describe('the gate', () => {
  it('rejects anything under eight characters', () => {
    expect(scorePassword('Ab1!').valid).toBe(false)
  })

  it('rejects a password with no number', () => {
    expect(scorePassword('abcdefghij').valid).toBe(false)
  })

  it('accepts eight characters with a number', () => {
    expect(scorePassword('abcdefg1').valid).toBe(true)
  })
})

describe('the meter', () => {
  it('says nothing at all for an empty field', () => {
    const s = scorePassword('')
    expect(s.level).toBe('empty')
    expect(s.label).toBe('')
    expect(s.score).toBe(0)
  })

  it('calls a short password weak even when it is varied', () => {
    // The trap: 'Ab1!' meets three of four rules and would score 3 on a naive
    // count — while being too short to submit. Saying "Good" about a password
    // the form will refuse is worse than saying nothing.
    const s = scorePassword('Ab1!')
    expect(s.level).toBe('weak')
    expect(s.score).toBe(1)
  })

  it('climbs as more is added', () => {
    expect(scorePassword('abcdefg1').label).toBe('Fair')
    expect(scorePassword('Abcdefg1').label).toBe('Good')
    expect(scorePassword('Abcdefg1!').label).toBe('Strong')
  })

  it('treats a long passphrase as strong without demanding a symbol', () => {
    // 'correct horse battery' is stronger than 'P@ss1', and a meter that says
    // otherwise teaches people to write 'Summer2026!'.
    const s = scorePassword('Correct horse battery 1')
    expect(s.level).toBe('strong')
  })
})

describe('the rules it reports', () => {
  it('marks each one so the form can show which is missing', () => {
    const s = scorePassword('abcdefg1')
    const byId = Object.fromEntries(s.rules.map(r => [r.id, r.met]))
    expect(byId).toEqual({ length: true, number: true, case: false, symbol: false })
  })

  it('separates the two that are enforced from the two that are advice', () => {
    const required = scorePassword('x').rules.filter(r => r.required).map(r => r.id)
    expect(required).toEqual(['length', 'number'])
  })
})
