'use client'

/**
 * The chrome around the nine-step challenge wizard.
 *
 * The shell knows about steps and navigation; it knows nothing about the
 * challenge being built. Anything that reads wizard state — the blueprint
 * panel — comes in through `sidebar`, so this file does not have to reach into
 * a route-local context from `components/`.
 */

import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, ArrowLeft, X, CloudUpload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'

export const WIZARD_STEPS = [
  { id: 1, label: 'Foundation' },
  { id: 2, label: 'Transformation' },
  { id: 3, label: 'Challenge Type' },
  { id: 4, label: 'Delivery & Schedule' },
  { id: 5, label: 'Audience & Access' },
  { id: 6, label: 'Experience' },
  { id: 7, label: 'Engagement & Communication' },
  { id: 8, label: 'Completion & Conversion' },
  { id: 9, label: 'Review & Create' },
]

// Context so Step9Review can reach onPublish without prop drilling.
export const WizardPublishContext = createContext<{
  onPublish?: () => void
  isPublishing?: boolean
}>({})

export function useWizardPublish() {
  return useContext(WizardPublishContext)
}

interface WizardShellProps {
  children: (step: number, setStep: (s: number) => void) => React.ReactNode
  /** The blueprint panel. Rendered by the route, which owns the wizard state. */
  sidebar?: React.ReactNode
  /** Where the close button and breadcrumb go back to. */
  exitHref: string
  onPublish?: () => void
  isPublishing?: boolean
  /** Null while nothing has been saved yet. */
  draftSavedAt?: Date | null
  onSaveDraft?: () => void
  isSavingDraft?: boolean
}

export function WizardShell({
  children, sidebar, exitHref, onPublish, isPublishing,
  draftSavedAt, onSaveDraft, isSavingDraft,
}: WizardShellProps) {
  const [step, setStep] = useState(1)

  return (
    // The workspace layout is `h-screen overflow-hidden` and hands scrolling to
    // each page, so this owns its own scroll container. `min-h-screen` here
    // silently clipped everything below the fold: the page looked complete and
    // simply would not scroll. `flex-1 w-full min-w-0` because this is also a
    // flex item in that layout's row.
    <div className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-5">
        <Link href="/dashboard" aria-label="Challenge Studio home" className="shrink-0">
          <Logo className="h-9" />
        </Link>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href={exitHref} className="text-muted-foreground hover:text-foreground">
                Challenges
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-foreground/50">›</li>
            <li className="truncate font-semibold text-foreground" aria-current="page">
              New challenge
            </li>
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            {isSavingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
              </>
            ) : draftSavedAt ? (
              <>
                <CloudUpload className="h-4 w-4" aria-hidden="true" /> Draft saved
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 opacity-40" aria-hidden="true" /> Not saved yet
              </>
            )}
          </span>

          <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isSavingDraft}>
            Save draft
          </Button>

          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" asChild>
            <Link href={exitHref} aria-label="Close the wizard">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">
              Create a Challenge
            </h1>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
              Step {step} of {WIZARD_STEPS.length}
            </span>
          </div>

          <Stepper current={step} onSelect={setStep} />

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-xl border border-border bg-background">
              <WizardPublishContext.Provider value={{ onPublish, isPublishing }}>
                {children(step, setStep)}
              </WizardPublishContext.Provider>
            </div>

            {/* Sticky against this pane's scroll container, whose top is the
                top bar — so the offset is the page padding, not the bar height. */}
            {sidebar && <div className="lg:sticky lg:top-6">{sidebar}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

/**
 * Only completed steps are clickable. Jumping ahead would land the reader on a
 * step whose answers depend on ones they have not given yet.
 */
function Stepper({ current, onSelect }: { current: number; onSelect: (s: number) => void }) {
  return (
    <ol className="mt-8 flex items-start">
      {WIZARD_STEPS.map((s, i) => {
        const done = s.id < current
        const active = s.id === current
        const reachable = done

        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {/* Connector rails, drawn either side so the circle stays centred
                  over its own label at every width. */}
              <span
                aria-hidden="true"
                className={cn('h-px flex-1', i === 0 ? 'opacity-0' : done || active ? 'bg-primary/40' : 'bg-border')}
              />
              <button
                type="button"
                onClick={() => reachable && onSelect(s.id)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors',
                  active && 'border-primary bg-primary text-primary-foreground',
                  done && 'cursor-pointer border-primary bg-background text-primary hover:bg-primary/10',
                  !active && !done && 'border-border bg-background text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : s.id}
                <span className="sr-only">
                  {s.label}
                  {done ? ' — completed' : active ? ' — current step' : ' — not reached yet'}
                </span>
              </button>
              <span
                aria-hidden="true"
                className={cn(
                  'h-px flex-1',
                  i === WIZARD_STEPS.length - 1 ? 'opacity-0' : done ? 'bg-primary/40' : 'bg-border'
                )}
              />
            </div>

            <span
              aria-hidden="true"
              className={cn(
                'mt-2.5 px-1 text-center text-[11px] leading-tight',
                active ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Step navigation ─────────────────────────────────────────────────────────

interface StepNavProps {
  step: number
  setStep: (s: number) => void
  canNext?: boolean
  nextLabel?: string
  isLast?: boolean
  onPublish?: () => void
  isPublishing?: boolean
  /** Field names still missing or invalid on this step. */
  errors?: Record<string, string>
  /** Called when Continue is pressed, valid or not, so the step can reveal errors. */
  onAttempt?: () => void
}

export function StepNav({
  step, setStep, canNext = true, nextLabel, isLast = false,
  onPublish, isPublishing, errors, onAttempt,
}: StepNavProps) {
  const problems = errors ? Object.keys(errors) : []
  const blocked = problems.length > 0
  const nextStep = WIZARD_STEPS[step]
  const label = nextLabel ?? (isLast ? 'Create challenge' : `Continue to ${nextStep?.label ?? 'next step'}`)

  function handleNext() {
    onAttempt?.()

    if (blocked) {
      // Deliberately not a disabled button. A button that does nothing when
      // clicked leaves the reader hunting for the reason; letting the press
      // land and moving them to the problem answers the question instead.
      const first = document.querySelector<HTMLElement>(`[data-field="${problems[0]}"]`)
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus({ preventScroll: true })
      return
    }

    if (isLast && onPublish) onPublish()
    else if (!isLast) setStep(step + 1)
  }

  const summaryId = `step-${step}-blocked`

  return (
    // `-mx-8` cancels the Section's horizontal padding so the divider reaches
    // the card edges, then px-8 puts the buttons back in line with the fields.
    <div className="-mx-8 mt-8 border-t border-border px-8 py-6">
      {blocked && (
        <p
          id={summaryId}
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {problems.length === 1
            ? 'One field still needs your attention before you can continue.'
            : `${problems.length} fields still need your attention before you can continue.`}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1 || isPublishing}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>

        {/* Not aria-disabled: the button is meant to be pressed while the step
            is incomplete — that press is what surfaces the reason. Marking it
            disabled would tell assistive tech the opposite of what it does. */}
        <Button
          disabled={!canNext || isPublishing}
          aria-describedby={blocked ? summaryId : undefined}
          onClick={handleNext}
          className="gap-2"
        >
          {isPublishing ? 'Creating…' : label}
          {!isPublishing && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
