/**
 * Plan definitions for the pricing page.
 *
 * **These prices are provisional.** OD-11 in the build plan is still open and
 * native billing is deliberately out of the MVP, so nothing here charges
 * anybody — every call to action goes to sign-up, and the page carries a
 * banner saying the beta is free. This file exists so that when the numbers
 * are decided, one edit here updates the cards and the comparison table
 * together.
 *
 * Limits are written as data rather than prose so the cards and the table can
 * never drift apart — a comparison table that contradicts the card above it
 * is the classic pricing-page bug.
 */

export type PlanId = 'starter' | 'professional' | 'business'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** Provisional. See the note at the top of this file. */
  monthly: number
  /** Provisional. Billed once a year; the saving is shown on the card. */
  yearlyMonthly: number
  /** Shown as the headline limit on the card. */
  highlights: string[]
  cta: string
  recommended?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Your first few challenges, run properly.',
    monthly: 29,
    yearlyMonthly: 24,
    highlights: [
      '3 active challenges',
      'Up to 100 participants each',
      '2 team members',
      'Core analytics',
    ],
    cta: 'Start free',
  },
  {
    id: 'professional',
    name: 'Professional',
    tagline: 'For creators running challenges as a business.',
    monthly: 79,
    yearlyMonthly: 66,
    highlights: [
      'Unlimited challenges',
      'Up to 1,000 participants each',
      '10 team members',
      'Full analytics and CSV export',
    ],
    cta: 'Start free',
    recommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Multiple brands, bigger audiences, a real team.',
    monthly: 199,
    yearlyMonthly: 166,
    highlights: [
      'Unlimited challenges',
      'Up to 10,000 participants each',
      'Unlimited team members',
      'Advanced branding and audit log',
    ],
    cta: 'Talk to us',
  },
]

/** Months paid for on the yearly plan — the rest is the saving. */
export const YEARLY_MONTHS_PAID = 10

// ─── Comparison table ────────────────────────────────────────────────────────

/** `true` renders a tick, `false` a dash, a string renders as-is. */
export type Cell = boolean | string

export interface FeatureRow {
  label: string
  note?: string
  starter: Cell
  professional: Cell
  business: Cell
}

export interface FeatureGroup {
  group: string
  rows: FeatureRow[]
}

export const COMPARISON: FeatureGroup[] = [
  {
    group: 'Usage limits',
    rows: [
      { label: 'Active challenges', starter: '3', professional: 'Unlimited', business: 'Unlimited' },
      { label: 'Participants per challenge', starter: '100', professional: '1,000', business: '10,000' },
      { label: 'Challenge length', note: 'days, or milestone-based', starter: 'Any', professional: 'Any', business: 'Any' },
      { label: 'Workspaces', note: 'separate brands or clients', starter: '1', professional: '1', business: '5' },
      { label: 'Team members per workspace', starter: '2', professional: '10', business: 'Unlimited' },
      { label: 'Archived challenges kept', starter: '1 year', professional: 'Forever', business: 'Forever' },
    ],
  },
  {
    group: 'Building and running',
    rows: [
      { label: 'All ten content block types', starter: true, professional: true, business: true },
      { label: 'Cohort, evergreen and self-paced modes', starter: true, professional: true, business: true },
      { label: 'Scheduled unlocking by timezone', starter: true, professional: true, business: true },
      { label: 'Private and invite-only challenges', starter: true, professional: true, business: true },
      { label: 'Approval-gated registration', starter: false, professional: true, business: true },
      { label: 'Duplicate a challenge to run it again', starter: true, professional: true, business: true },
      { label: 'Reusable challenge templates', starter: false, professional: true, business: true },
    ],
  },
  {
    group: 'Participants and community',
    rows: [
      { label: 'Challenge feed, comments and reactions', starter: true, professional: true, business: true },
      { label: 'Points, streaks and badges', starter: true, professional: true, business: true },
      { label: 'Leaderboard', note: 'optional per challenge', starter: true, professional: true, business: true },
      { label: 'Submission review and feedback', starter: true, professional: true, business: true },
      { label: 'Private reflections', starter: true, professional: true, business: true },
      { label: 'Live sessions with replays', starter: '2 per challenge', professional: 'Unlimited', business: 'Unlimited' },
    ],
  },
  {
    group: 'Analytics',
    rows: [
      { label: 'Registrations, activation and completion', starter: true, professional: true, business: true },
      { label: 'Day-by-day completion curve', starter: true, professional: true, business: true },
      { label: 'At-risk participant list', starter: false, professional: true, business: true },
      { label: 'Participant-level reporting', starter: false, professional: true, business: true },
      { label: 'CSV export', starter: false, professional: true, business: true },
      { label: 'Workspace-wide reporting', starter: false, professional: false, business: true },
      { label: 'Export audit log', starter: false, professional: false, business: true },
    ],
  },
  {
    group: 'Communication',
    rows: [
      { label: 'Automated challenge emails', starter: true, professional: true, business: true },
      { label: 'Edit any message', starter: true, professional: true, business: true },
      { label: 'Delivery log', starter: false, professional: true, business: true },
      { label: 'Send from your own domain', starter: false, professional: false, business: true },
    ],
  },
  {
    group: 'Branding',
    rows: [
      { label: 'Your logo and colours', starter: true, professional: true, business: true },
      { label: 'Custom registration page copy', starter: true, professional: true, business: true },
      { label: 'Remove Challenge Studio branding', starter: false, professional: true, business: true },
      { label: 'Custom domain', note: 'not yet available on any plan', starter: false, professional: false, business: false },
    ],
  },
  {
    group: 'Support',
    rows: [
      { label: 'Documentation and email support', starter: true, professional: true, business: true },
      { label: 'Priority support', note: 'first in the queue', starter: false, professional: true, business: true },
      { label: 'Onboarding call', starter: false, professional: false, business: true },
      { label: 'Named contact', starter: false, professional: false, business: true },
    ],
  },
]
