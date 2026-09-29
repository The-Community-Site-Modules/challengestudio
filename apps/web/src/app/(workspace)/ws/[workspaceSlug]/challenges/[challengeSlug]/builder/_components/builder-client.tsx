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
import { DesktopPreview, MobilePreview } from './participant-preview'

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

/**
 * Three modes, not three widths. Edit is the block canvas; Desktop and Mobile
 * render the day the way a participant meets it, in the frame that matches.
 * Judging whether a day works is a different job from assembling it.
 */
type Viewport = 'edit' | 'desktop' | 'mobile'

export function BuilderClient({ challenge, initialSteps }: Props) {
  const [steps, setSteps] = useState<BuilderDay[]>(initialSteps)
  const [activeStepId, setActiveStepId] = useState(initialSteps[0]?.id ?? '')
  const [viewport, setViewport] = useState<Viewport>('edit')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dirty, setDirty] = useState(false)
  /**
   * Undo history for the open day's blocks. Per-day and in memory only:
   * switching days starts a fresh stack, because undoing across a day boundary
   * would silently rewrite a day the creator is no longer looking at.
   */
  const [history, setHistory] = useState<BlockItem[][]>(() =>
    initialSteps[0] ? [initialSteps[0].blocks] : []
  )
  const [historyIndex, setHistoryIndex] = useState(initialSteps[0] ? 0 : -1)
  const [isSaving, startSaving] = useTransition()
  const [isPublishing, startPublishing] = useTransition()
  const [publishErrors, setPublishErrors] = useState<string[]>([])

  const ws = challenge.workspaceSlug
  const activeIndex = steps.findIndex((s) => s.id === activeStepId)
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined

  const isLive = challenge.status === 'PUBLISHED' || challenge.status === 'ACTIVE'

  const dayView = {
    dayNumber: activeIndex + 1,
    totalDays: steps.length,
    title: activeStep?.title ?? '',
    description: activeStep?.description ?? null,
    blocks: activeStep?.blocks ?? [],
    hasNextDay: activeIndex >= 0 && activeIndex < steps.length - 1,
  }

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
      // A brand new day is not in `steps` yet, so its history starts here
      // rather than going through handleSelectStep.
      setHistory([[]])
      setHistoryIndex(0)
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

  function handleSelectStep(id: string) {
    setActiveStepId(id)
    const next = steps.find((s) => s.id === id)
    setHistory(next ? [next.blocks] : [])
    setHistoryIndex(next ? 0 : -1)
  }

  // ── Blocks ─────────────────────────────────────────────────────────────
  function handleBlocksChange(blocks: BlockItem[]) {
    patchActive({ blocks, blockCount: blocks.length })
    setDirty(true)
    // Anything after the current point is a branch the creator undid past and
    // has now replaced, so it is dropped rather than kept as a redo.
    setHistory((h) => [...h.slice(0, historyIndex + 1), blocks])
    setHistoryIndex((i) => i + 1)
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1

  function stepHistory(delta: -1 | 1) {
    const target = historyIndex + delta
    const blocks = history[target]
    if (!blocks) return
    patchActive({ blocks, blockCount: blocks.length })
    setHistoryIndex(target)
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
          <div className="hidden items-center gap-0.5 sm:flex">
            <button
              type="button"
              onClick={() => stepHistory(-1)}
              disabled={!canUndo}
              aria-label="Undo"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => stepHistory(1)}
              disabled={!canRedo}
              aria-label="Redo"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
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

          {/* Opens in its own tab: the whole point is to see the challenge
              without losing the day being edited, and unsaved blocks live in
              this component's state — navigating away would drop them.
              `rel` is not optional on a `_blank` link; without it the opened
              page gets `window.opener` back. */}
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link
              href={`/ws/${ws}/challenges/${challenge.slug}/preview`}
              target="_blank"
              rel="noopener noreferrer"
            >
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
            onSelectStep={handleSelectStep}
            onAddStep={handleAddStep}
            onReorder={handleReorder}
          />
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {activeStep ? (
            viewport === 'edit' ? (
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
            ) : viewport === 'desktop' ? (
              <DesktopPreview day={dayView} />
            ) : (
              <MobilePreview day={dayView} onBackToEditing={() => setViewport('edit')} />
            )
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
