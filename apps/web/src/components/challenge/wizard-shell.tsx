'use client'

import { useState, createContext, useContext } from 'react'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const WIZARD_STEPS = [
  { id: 1, label: 'Foundation' },
  { id: 2, label: 'Outcome' },
  { id: 3, label: 'Mode' },
  { id: 4, label: 'Schedule' },
  { id: 5, label: 'Audience' },
  { id: 6, label: 'Experience' },
  { id: 7, label: 'Communications' },
  { id: 8, label: 'Conversion' },
  { id: 9, label: 'Review' },
]

// Context so Step9Review can access onPublish without prop drilling
export const WizardPublishContext = createContext<{
  onPublish?: () => void
  isPublishing?: boolean
}>({})

export function useWizardPublish() {
  return useContext(WizardPublishContext)
}

interface WizardShellProps {
  children: (step: number, setStep: (s: number) => void) => React.ReactNode
  onPublish?: () => void
  isPublishing?: boolean
}

export function WizardShell({ children, onPublish, isPublishing }: WizardShellProps) {
  const [step, setStep] = useState(1)
  const pct = Math.round(((step - 1) / (WIZARD_STEPS.length - 1)) * 100)

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Progress header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              Step {step} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1]?.label}
            </p>
            <p className="text-xs text-muted-foreground">{pct}% complete</p>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {WIZARD_STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all',
                  s.id < step  ? 'bg-primary cursor-pointer' :
                  s.id === step ? 'bg-primary' :
                  'bg-muted'
                )}
                title={s.label}
                aria-label={`Go to step ${s.id}: ${s.label}`}
              />
            ))}
          </div>
          {/* Step labels — desktop */}
          <div className="mt-2 hidden grid-cols-9 md:grid">
            {WIZARD_STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center">
                <div className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                  s.id < step  ? 'bg-primary text-primary-foreground' :
                  s.id === step ? 'ring-2 ring-primary bg-background text-primary' :
                  'bg-muted text-muted-foreground'
                )}>
                  {s.id < step ? <CheckCircle className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={cn(
                  'mt-1 text-center text-[10px] leading-tight',
                  s.id === step ? 'font-semibold text-primary' : 'text-muted-foreground'
                )}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 py-10 px-6">
        <div className="mx-auto max-w-2xl">
          <WizardPublishContext.Provider value={{ onPublish, isPublishing }}>
            {children(step, setStep)}
          </WizardPublishContext.Provider>
        </div>
      </div>
    </div>
  )
}

interface StepNavProps {
  step: number
  setStep: (s: number) => void
  canNext?: boolean
  nextLabel?: string
  isLast?: boolean
  onPublish?: () => void
  isPublishing?: boolean
}

export function StepNav({ step, setStep, canNext = true, nextLabel = 'Continue', isLast = false, onPublish, isPublishing }: StepNavProps) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
      {step > 1 ? (
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPublishing}>
          Back
        </Button>
      ) : (
        <div />
      )}
      <Button
        disabled={!canNext || isPublishing}
        onClick={() => {
          if (isLast && onPublish) onPublish()
          else if (!isLast) setStep(step + 1)
        }}
        className="gap-2"
      >
        {isPublishing ? 'Publishing…' : nextLabel}
        {!isLast && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}
