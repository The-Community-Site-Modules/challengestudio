'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface WizardState {
  // Step 1 — Foundation
  title:            string
  slug:             string
  description:      string
  category:         string
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
  title: '', slug: '', description: '', category: '',
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

interface WizardContextValue {
  data:   WizardState
  update: (patch: Partial<WizardState>) => void
  reset:  () => void
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardState>(INITIAL)

  const update = useCallback((patch: Partial<WizardState>) => {
    setData(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setData(INITIAL), [])

  return (
    <WizardContext.Provider value={{ data, update, reset }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
