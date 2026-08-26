'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle, Clock, Zap,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn }        from '@/lib/utils'
import { ContentBlock } from '@/components/challenge/content-blocks'
import { completeStepAction } from '../../../actions'

interface Block {
  id:   string
  type: string
  data: Record<string, string>
}

interface StepInfo {
  id:              string
  title:           string
  order:           number
  estimatedMinutes: number | null
  pointsXp:        number | null
  isRequired:      boolean
  totalSteps:      number
  blocks:          Block[]
}

interface Props {
  challengeSlug: string
  step:          StepInfo
  isCompleted:   boolean
  participantId: string
}

// ─── Main client component ────────────────────────────────────────────────

export function DayClient({ challengeSlug, step, isCompleted: initialCompleted, participantId }: Props) {
  const [blockData,    setBlockData]    = useState<Record<string, unknown>>({})
  const [completed,    setCompleted]    = useState(initialCompleted)
  const [isCompleting, startCompleting] = useTransition()
  const dayNumber  = step.order + 1
  const xpValue    = step.pointsXp ?? 100

  function handleBlockInteract(blockId: string, value: unknown) {
    setBlockData(prev => ({ ...prev, [blockId]: value }))
  }

  function handleComplete() {
    startCompleting(async () => {
      await completeStepAction(challengeSlug, step.id, { ...blockData, participantId })
      setCompleted(true)
    })
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Day header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/c/${challengeSlug}/hub`} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              Step {dayNumber} — {step.title}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            {step.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />{step.estimatedMinutes} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-primary" />{xpValue} XP
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div className="flex gap-1">
            {Array.from({ length: step.totalSteps }, (_, i) => (
              <div key={i} className={cn('h-1 flex-1 rounded-full',
                i < dayNumber - 1  ? 'bg-green-500' :
                i === dayNumber - 1 ? 'bg-primary'   : 'bg-muted')} />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Step {dayNumber} of {step.totalSteps}
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* Step intro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default">Step {dayNumber}</Badge>
            {completed && <Badge variant="success">Completed ✓</Badge>}
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">{step.title}</h1>
        </div>

        {/* Content blocks from DB */}
        {step.blocks.length > 0 ? (
          step.blocks.map((block) => {
            return <ContentBlock key={block.id} block={block} onInteract={handleBlockInteract} />
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <p className="text-sm">Content for this step hasn&apos;t been added yet.</p>
            <p className="text-xs mt-1">Check back soon!</p>
          </div>
        )}

        <Separator />

        {/* Complete step */}
        {!completed ? (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Mark step {dayNumber} complete</h3>
            <Button size="lg" className="w-full sm:w-auto gap-2 font-bold"
              onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? 'Saving…' : `Complete Step ${dayNumber} — Earn ${xpValue} XP`}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-8 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <h3 className="text-xl font-bold text-green-800">Step {dayNumber} complete!</h3>
            <p className="text-sm text-green-600">You earned {xpValue} XP.</p>
            <div className="flex flex-col gap-2 sm:flex-row justify-center">
              <Button variant="outline" asChild className="gap-2">
                <Link href={`/c/${challengeSlug}/hub`}>
                  <ArrowLeft className="h-4 w-4" /> Back to hub
                </Link>
              </Button>
              {dayNumber < step.totalSteps && (
                <Button asChild className="gap-2">
                  <Link href={`/c/${challengeSlug}/day/${dayNumber + 1}`}>
                    Next step <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {dayNumber === step.totalSteps && (
                <Button asChild className="gap-2">
                  <Link href={`/c/${challengeSlug}/complete`}>
                    See your results <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step navigation */}
        <div className="flex items-center justify-between pt-4">
          {dayNumber > 1 ? (
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/c/${challengeSlug}/day/${dayNumber - 1}`}>
                <ArrowLeft className="h-4 w-4" /> Step {dayNumber - 1}
              </Link>
            </Button>
          ) : <div />}

          {dayNumber < step.totalSteps ? (
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/c/${challengeSlug}/day/${dayNumber + 1}`}>
                Step {dayNumber + 1} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : <div />}
        </div>

      </main>
    </div>
  )
}
