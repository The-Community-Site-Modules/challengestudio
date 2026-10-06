'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface WizardState {
  // Step 1 — Foundation
  title:            string
  slug:             string
  description:      string
  category:         string
  /** The uploaded cover image's public URL. */
  coverImageUrl:    string
  /** Shown on the registration page as who is running this. */
  hostName:         string
  // Step 2 — Outcome
  promise:          string
  outcome:          string
  startingPoint:    string
  successDefinition: string
  timeCommitment:   string
  // Step 3 — Mode
  mode:             string
  // Step 4 — Schedule
  timezone:         string
  startsAt:         string
  endsAt:           string
  registrationOpensAt:  string
  registrationClosesAt: string
  unlockModel:      string
  gracePeriod:      string
  // Step 5 — Audience
  visibility:       string
  maxParticipants:  string
  requiresApproval: boolean
  // Step 6 — Experience
  numDays:          string
  features:         Record<string, boolean>
  // Step 7 — Communications
  emailTriggers:    Record<string, boolean>
  inactivityDays:   string
  // Step 8 — Conversion
  hasOffer:         boolean
  offerHeadline:    string
  offerCtaText:     string
  offerUrl:         string
  offerDeadline:    string
  offerBonuses:     string
}

const INITIAL: WizardState = {
  title: '', slug: '', description: '', category: '', hostName: '', coverImageUrl: '',
  promise: '', outcome: '', startingPoint: '', successDefinition: '', timeCommitment: '30 minutes',
  mode: 'marketing',
  timezone: 'America/New_York', startsAt: '', endsAt: '',
  registrationOpensAt: '', registrationClosesAt: '',
  unlockModel: 'fixed_calendar', gracePeriod: 'None',
  visibility: 'public', maxParticipants: '', requiresApproval: false,
  numDays: '5',
  features: {
    liveSessions: true, community: true, submissions: true,
    gamification: true, leaderboard: false, reflections: true,
  },
  emailTriggers: {
    registration: true, start: true, daily: true,
    reminder: true, inactivity: true, completion: true,
  },
  inactivityDays: '2 days',
  hasOffer: true, offerHeadline: '', offerCtaText: '',
  offerUrl: '', offerDeadline: '', offerBonuses: '',
}

/**
 * Where an unfinished wizard lives.
 *
 * A nine-step form is long enough that a closed tab halfway through is a real
 * loss, and the challenge does not exist server-side until the last step, so
 * there is no row to save against. `localStorage` is the honest fit: it
 * survives a refresh and a closed tab, it is this browser only, and it is
 * never read back by anything but this wizard.
 *
 * Every access is wrapped: in a private window or with site data blocked, the
 * accessor throws rather than returning null, and the wizard must still open.
 */
const DRAFT_KEY = 'challenge-wizard-draft'

function readDraft(): WizardState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    // Spread over INITIAL so a draft written before a field existed still
    // loads, with the new field at its default rather than undefined.
    return { ...INITIAL, ...(JSON.parse(raw) as Partial<WizardState>) }
  } catch {
    return null
  }
}

interface WizardContextValue {
  data:   WizardState
  update: (patch: Partial<WizardState>) => void
  reset:  () => void
  /** Steps whose Continue button has been pressed at least once. */
  attempted: Record<number, boolean>
  markAttempted: (step: number) => void
  /** Null until something has been written this session. */
  draftSavedAt: Date | null
  saveDraft: () => void
  clearDraft: () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardState>(INITIAL)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)

  // Restored after mount, not in the initialiser: reading localStorage while
  // rendering on the server is impossible and doing it in a lazy initialiser
  // makes the first client render disagree with the server's HTML.
  useEffect(() => {
    const restored = readDraft()
    if (restored) {
      setData(restored)
      setDraftSavedAt(new Date())
    }
  }, [])

  const saveDraft = useCallback(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
      setDraftSavedAt(new Date())
    } catch {
      // Storage unavailable or full. The wizard still works in memory, so
      // failing loudly here would be worse than the draft not persisting.
    }
  }, [data])

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* nothing to clean up if it was never written */
    }
    setDraftSavedAt(null)
  }, [])

  // Errors stay hidden until the reader tries to leave a step. Marking every
  // empty required field red the moment the form opens tells someone they got
  // something wrong before they have had a chance to type.
  const [attempted, setAttempted] = useState<Record<number, boolean>>({})

  const update = useCallback((patch: Partial<WizardState>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const markAttempted = useCallback((step: number) => {
    setAttempted(prev => (prev[step] ? prev : { ...prev, [step]: true }))
  }, [])

  const reset = useCallback(() => {
    setData(INITIAL)
    setAttempted({})
    clearDraft()
  }, [clearDraft])

  return (
    <WizardContext.Provider
      value={{ data, update, reset, attempted, markAttempted, draftSavedAt, saveDraft, clearDraft }}
    >
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
