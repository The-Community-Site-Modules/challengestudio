/**
 * Password strength, scored on rules rather than on entropy maths.
 *
 * A meter that reports "strong" for `Password1!` teaches the wrong lesson, and
 * one that reports a percentage nobody can act on teaches nothing. These are
 * the four things a person can actually change, and the meter says which one
 * is missing.
 *
 * The first two are enforced — Supabase rejects under eight characters and the
 * form requires a digit. The last two only raise the score, because refusing a
 * long passphrase for lacking a symbol is how people end up with `Summer2026!`
 * in a password manager they do not use.
 *
 * Kept out of the component so it can be tested without rendering anything.
 */

export interface Rule {
  id: string
  label: string
  met: boolean
  /** Enforced rules block submission; the rest only affect the score. */
  required: boolean
}

export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

export interface Strength {
  level: StrengthLevel
  /** 0–4, for the segmented bar. */
  score: number
  label: string
  rules: Rule[]
  /** Whether the enforced rules are all satisfied. */
  valid: boolean
}

const LABEL: Record<StrengthLevel, string> = {
  empty:  '',
  weak:   'Weak',
  fair:   'Fair',
  good:   'Good',
  strong: 'Strong',
}

export function scorePassword(password: string): Strength {
  const rules: Rule[] = [
    { id: 'length', label: 'At least 8 characters',      met: password.length >= 8,      required: true },
    { id: 'number', label: 'A number',                   met: /\d/.test(password),       required: true },
    { id: 'case',   label: 'Upper and lower case',       met: /[a-z]/.test(password) && /[A-Z]/.test(password), required: false },
    { id: 'symbol', label: 'A symbol, or 12+ characters', met: /[^A-Za-z0-9]/.test(password) || password.length >= 12, required: false },
  ]

  const valid = rules.filter(r => r.required).every(r => r.met)
  const met = rules.filter(r => r.met).length

  if (password.length === 0) {
    return { level: 'empty', score: 0, label: '', rules, valid: false }
  }

  // Until the enforced rules pass, the meter says weak whatever else is true —
  // a seven-character password with a symbol is not "fair", it is rejected.
  const level: StrengthLevel = !valid
    ? 'weak'
    : met === 2 ? 'fair'
    : met === 3 ? 'good'
    : 'strong'

  const score = level === 'weak' ? 1 : level === 'fair' ? 2 : level === 'good' ? 3 : 4

  return { level, score, label: LABEL[level], rules, valid }
}
