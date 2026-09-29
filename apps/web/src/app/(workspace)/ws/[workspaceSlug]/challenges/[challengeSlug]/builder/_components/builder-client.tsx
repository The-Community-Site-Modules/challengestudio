'use client'

/**
 * The day builder: journey on the left, the day itself in the middle, its
 * settings on the right.
 *
 * ── Why blocks have an explicit Save and settings do not ────────────────────
 *
 * Settings write one field at a time and persist on blur, because each is
 * independent and losing one to a closed tab is cheap. Blocks are a single
 * ordered list that the server rewrites wholesale — `saveBlocksAction` deletes
 * and recreates — so autosaving every keystroke would mean deleting and
 * recreating the day's content on every keystroke. Hence one Save button, and
 * a dirty marker so it is obvious when there is something to press it for.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, PanelLeft, Eye, Send, Loader2, AlertCircle, Undo2, Redo2,
  Pencil, Monitor, Smartphone, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BuilderStep } from '@/components/challenge/builder-sidebar'
import type { BlockItem } from '@/components/challenge/content-block-editor'
import {
  addStepAction, updateStepAction, reorderStepsAction,
  saveBlocksAction, publishChallengeAction, unpublishChallengeAction,
} from '../../../actions'
import { JourneySidebar } from './journey-sidebar'
import { DaySettings, type DayPatch } from './day-settings'
import { BlockCanvas, DayHeader } from './block-canvas'

export type BuilderDay = BuilderStep & {
  blocks: BlockItem[]
  description?: string | null
  unlockRule?: string | null
  tomorrowTeaser?: string | null
  /** Pre-formatted by the server in the challenge's timezone. */
  unlocksAtLabel?: string | null
}

interface Props {
  challenge: {
    id: string
    title: string
    slug: string
    status: string
    modeLabel: string
    workspaceSlug: string
  }
  initialSteps: BuilderDay[]
}

type Viewport = 'edit' | 'desktop' | 'mobile'

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  edit: 'max-w-[720px]',
  desktop: 'max-w-[960px]',
  mobile: 'max-w-[390px]',
}

export function BuilderClient({ challenge, initialSteps }: Props) {
  const [steps, setSteps] = useState<BuilderDay[]>(initialSteps)
  const [activeStepId, setActiveStepId] = useState(initialSteps[0]?.id ?? '')
  const [viewport, setViewport] = useState<Viewport>('edit')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [isSaving, startSaving] = useTransition()
  const [isPublishing, startPublishing] = useTransition()
  const [publishErrors, setPublishErrors] = useState<string[]>([])

  const ws = challenge.workspaceSlug
  const activeIndex = steps.findIndex((s) => s.id === activeStepId)
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined

  const isLive = challenge.status === 'PUBLISHED' || challenge.status === 'ACTIVE'

  function patchActive(patch: Partial<BuilderDay>) {
    setSteps((prev) => prev.map((s) => (s.id === activeStepId ? { ...s, ...patch } : s)))
  }

  // ── Days ───────────────────────────────────────────────────────────────
  function handleAddStep() {
    startSaving(async () => {
      const result = await addStepAction(challenge.id, ws)
      const day: BuilderDay = {
        id: result.id,
        position: steps.length,
        order: result.order,
        type: 'day',
        stepType: 'day',
        title: result.title,
        status: 'empty',
        blockCount: 0,
        isRequired: true,
        isPublished: false,
        blocks: [],
      }
      setSteps((prev) => [...prev, day])
      setActiveStepId(result.id)
    })
  }

  function handleReorder(orderedIds: string[]) {
    setSteps((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]))
      return orderedIds.flatMap((id, i) => {
        const s = byId.get(id)
        return s ? [{ ...s, order: i, position: i }] : []
      })
    })
    startSaving(async () => {
      await reorderStepsAction(challenge.id, ws, orderedIds)
    })
  }

  function handleSettingsUpdate(patch: DayPatch) {
    if (!activeStep) return
    patchActive(patch as Partial<BuilderDay>)
    startSaving(async () => {
      await updateStepAction(activeStep.id, ws, patch as Record<string, unknown>)
    })
  }

  // ── Blocks ─────────────────────────────────────────────────────────────
  function handleBlocksChange(blocks: BlockItem[]) {
    patchActive({ blocks, blockCount: blocks.length })
    setDirty(true)
  }

  function handleSave() {
    if (!activeStep) return
    const blocks = activeStep.blocks
    startSaving(async () => {
      await saveBlocksAction(
        activeStep.id,
        ws,
        blocks.map((b, i) => ({
          id: b.id,
          type: b.type,
          order: i,
          data: b.payload as Record<string, unknown>,
          required: b.required,
          points: b.points ?? 0,
        }))
      )
      setDirty(false)
    })
  }

  // ── Publish ────────────────────────────────────────────────────────────
  function handlePublish() {
    startPublishing(async () => {
      const result = await publishChallengeAction(challenge.id, ws)
      if (!result.success) setPublishErrors(result.errors)
    })
  }

  function handleUnpublish() {
    startPublishing(async () => {
      const result = await unpublishChallengeAction(challenge.id, ws)
      if (!result.success && result.error) setPublishErrors([result.error])
    })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
        <Link
          href={`/ws/${ws}/challenges`}
          aria-label="Back to challenges"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? 'Hide the journey panel' : 'Show the journey panel'}
          aria-expanded={sidebarOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <p className="truncate text-sm font-semibold text-foreground">{challenge.title}</p>
        <Badge variant={isLive ? 'success' : 'secondary'}>{isLive ? 'Live' : 'Draft'}</Badge>

        <div className="ml-auto flex items-center gap-2">
          {/* Disabled rather than absent: the design has them, the builder has
              no history stack, and a control that looks live but does nothing
              is the worse of the two. */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <button
              type="button"
              disabled
              aria-label="Undo — not available yet"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/40"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled
              aria-label="Redo — not available yet"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/40"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div
            role="group"
            aria-label="Canvas width"
            className="hidden items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5 md:flex"
          >
            {([
              { id: 'edit', label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" /> },
              { id: 'desktop', label: 'Desktop', icon: <Monitor className="h-3.5 w-3.5" /> },
              { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-3.5 w-3.5" /> },
            ] as const).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewport(v.id)}
                aria-pressed={viewport === v.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  viewport === v.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/ws/${ws}/challenges/${challenge.slug}/preview`}>
              <Eye className="h-4 w-4" /> Preview Challenge
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !dirty}
            className="gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? null : <Check className="h-4 w-4" />}
            {isSaving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>

          {isLive ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleUnpublish}
              disabled={isPublishing}
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              Unpublish
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPublishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
        </div>
      </header>

      {publishErrors.length > 0 && (
        <div role="alert" className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">
                {publishErrors.length === 1
                  ? 'One thing to fix before publishing'
                  : `${publishErrors.length} things to fix before publishing`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {publishErrors.map((e) => (
                  <li key={e} className="flex gap-2 text-xs text-destructive/90">
                    <span aria-hidden="true">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setPublishErrors([])}
              className="shrink-0 text-xs font-medium text-destructive/70 hover:text-destructive"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Three panes ──────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <JourneySidebar
            steps={steps}
            activeStepId={activeStepId}
            challengeTitle={challenge.title}
            modeLabel={challenge.modeLabel}
            settingsHref={`/ws/${ws}/challenges/${challenge.slug}/settings`}
            onSelectStep={setActiveStepId}
            onAddStep={handleAddStep}
            onReorder={handleReorder}
          />
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {activeStep ? (
            <div className={cn('mx-auto', VIEWPORT_WIDTH[viewport])}>
              <BlockCanvas
                blocks={activeStep.blocks}
                onBlocksChange={handleBlocksChange}
                header={
                  <DayHeader
                    dayNumber={activeIndex + 1}
                    title={activeStep.title}
                    description={activeStep.description ?? null}
                    estimatedMinutes={activeStep.estimatedMinutes ?? null}
                    points={activeStep.pointsXp ?? null}
                    isRequired={activeStep.isRequired}
                    unlocksAt={activeStep.unlocksAtLabel ?? null}
                  />
                }
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-lg font-medium text-foreground">No days yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add the first day from the journey panel.
                </p>
              </div>
            </div>
          )}
        </main>

        {activeStep && (
          <DaySettings
            step={activeStep}
            dayNumber={activeIndex + 1}
            unlocksAt={activeStep.unlocksAtLabel ?? null}
            onUpdate={handleSettingsUpdate}
          />
        )}
      </div>
    </div>
  )
}
