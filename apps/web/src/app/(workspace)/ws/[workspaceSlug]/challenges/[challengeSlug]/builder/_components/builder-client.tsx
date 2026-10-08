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

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, PanelLeft, Eye, Send, Loader2, AlertCircle, Undo2, Redo2,
  Pencil, Monitor, Smartphone, Check, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BuilderStep } from '@/components/challenge/builder-sidebar'
import type { BlockItem } from '@/components/challenge/content-block-editor'
import {
  addStepAction, updateStepAction, reorderStepsAction, deleteStepAction,
  saveBlocksAction, publishChallengeAction, unpublishChallengeAction,
} from '../../../actions'
import { JourneySidebar } from './journey-sidebar'
import { DaySettings, type DayPatch } from './day-settings'
import { BlockCanvas, DayHeader, stripEmptyChecklistItems } from './block-canvas'
import { DesktopPreview, MobilePreview } from './participant-preview'

export type BuilderDay = BuilderStep & {
  blocks: BlockItem[]
  description?: string | null
  unlockRule?: string | null
  tomorrowTeaser?: string | null
  dayImageUrl?: string | null
  /** Pre-formatted by the server in the challenge's timezone. */
  unlocksAtLabel?: string | null
  /** Participant submissions on this day — destroyed if the day is deleted. */
  submissionCount?: number
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
  /** Days whose blocks have unsaved changes — tracked per day, see handleSave. */
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(() => new Set())
  const dirty = dirtyIds.size > 0
  // The latest steps, for the save loop to compare against after an await.
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  // Leaving with unsaved blocks asks first, rather than discarding them.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function markDirty(id: string) {
    setDirtyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }
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
  /** A setting that would not save. Shown, not thrown. */
  const [saveError, setSaveError] = useState<string | null>(null)

  const ws = challenge.workspaceSlug
  const router = useRouter()
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

  function handleDeleteStep(id: string) {
    setSaveError(null)
    startSaving(async () => {
      try {
        await deleteStepAction(id, ws)
      } catch (error) {
        setSaveError(
          error instanceof Error && error.message
            ? `The day was not deleted: ${error.message}`
            : 'The day was not deleted.'
        )
        return
      }

      // The server closes the gap in `order`; mirror it so a later reorder or
      // the participant preview does not work from stale numbers.
      const remaining = steps
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i, position: i }))
      setSteps(remaining)
      setDirtyIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })

      // Land on a neighbour rather than an empty canvas when the open day is
      // the one that just went.
      if (activeStepId === id) {
        const next = remaining[Math.min(activeIndex, remaining.length - 1)]
        setActiveStepId(next?.id ?? '')
        setHistory(next ? [next.blocks] : [])
        setHistoryIndex(next ? 0 : -1)
      }
    })
  }

  /**
   * Save one setting, and survive it failing.
   *
   * Without the catch, any rejection from the action propagates out of the
   * transition and React replaces the whole builder with the error boundary —
   * taking unsaved blocks with it. A field that would not save is a message;
   * it is not a reason to lose the day someone was building.
   */
  function handleSettingsUpdate(patch: DayPatch) {
    if (!activeStep) return
    const before = activeStep
    patchActive(patch as Partial<BuilderDay>)
    setSaveError(null)

    startSaving(async () => {
      try {
        const result = await updateStepAction(before.id, ws, patch as Record<string, unknown>)
        // A refusal comes back as a value — thrown messages are hidden in
        // production — so route it through the same revert-and-explain path.
        if ('error' in result) throw new Error(result.error)
      } catch (error) {
        // Put the old value back, so the panel is not showing something the
        // database does not have.
        setSteps((prev) => prev.map((s) => (s.id === before.id ? before : s)))
        setSaveError(
          error instanceof Error && error.message
            ? `That setting did not save: ${error.message}`
            : 'That setting did not save.'
        )
      }
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
    markDirty(activeStepId)
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
    markDirty(activeStepId)
  }

  /**
   * Save every day with unsaved blocks, not just the open one.
   *
   * Dirtiness used to be one flag for the whole builder: edit day 2, open
   * day 3, press Save, and day 3 was saved, the flag cleared, and day 2's
   * edits were dropped without a word.
   */
  function handleSave() {
    const toSave = steps.filter((s) => dirtyIds.has(s.id))
    if (toSave.length === 0) return
    setSaveError(null)
    startSaving(async () => {
      for (const step of toSave) {
        try {
          const result = await saveBlocksAction(
            step.id,
            ws,
            step.blocks.map(stripEmptyChecklistItems).map((b, i) => ({
              id: b.id,
              type: b.type,
              order: i,
              data: b.payload as Record<string, unknown>,
              required: b.required,
              points: b.points ?? 0,
            }))
          )
          if (!result.success) {
            setSaveError(`"${step.title}" did not save: ${result.error}`)
            return
          }
        } catch (error) {
          // The day stays dirty on purpose: its blocks are still unsaved, and
          // the Save button has to keep offering to try again.
          setSaveError(
            error instanceof Error && error.message
              ? `"${step.title}" did not save: ${error.message}`
              : `"${step.title}" did not save.`
          )
          return
        }
        // Clear it only if nothing changed while the save was in flight;
        // otherwise those newer edits are still unsaved.
        const savedBlocks = step.blocks
        setDirtyIds((prev) => {
          const current = stepsRef.current.find((s) => s.id === step.id)
          if (current && current.blocks !== savedBlocks) return prev
          const next = new Set(prev)
          next.delete(step.id)
          return next
        })
      }
    })
  }

  // ── Publish ────────────────────────────────────────────────────────────
  /**
   * The publish gate reads the database, not this screen. With unsaved blocks
   * it reported "no content blocks" for a day that visibly had them, and
   * "publish ready days" could make a day live whose content was never saved.
   */
  const UNSAVED = 'Save your changes before publishing — the blocks on screen are not saved yet.'

  function handlePublish() {
    if (dirty) { setPublishErrors([UNSAVED]); return }
    startPublishing(async () => {
      const result = await publishChallengeAction(challenge.id, ws)
      if (!result.success) { setPublishErrors(result.errors); return }
      setPublishErrors([])
      // The status badge and live/draft controls come from the server props.
      router.refresh()
    })
  }

  /** Days with content that nobody has made visible yet. */
  const readyUnpublished = steps.filter((s) => !s.isPublished && s.blocks.length > 0)

  /**
   * The gate refuses to publish a challenge with no published day, and the
   * only cure was a switch in a side panel the creator may never have scrolled
   * to — so the error named a problem and hid its solution. Pressing Publish
   * says what the intent is; this makes acting on it one click, and still an
   * explicit one, because staging days deliberately is a real thing to want.
   */
  function handlePublishReadyDays() {
    if (dirty) { setPublishErrors([UNSAVED]); return }
    startPublishing(async () => {
      await Promise.all(
        readyUnpublished.map((s) => updateStepAction(s.id, ws, { isPublished: true }))
      )
      const published = new Set(readyUnpublished.map((s) => s.id))
      setSteps((prev) => prev.map((s) => (published.has(s.id) ? { ...s, isPublished: true } : s)))

      const result = await publishChallengeAction(challenge.id, ws)
      setPublishErrors(result.success ? [] : result.errors)
      if (result.success) router.refresh()
    })
  }

  function handleUnpublish() {
    startPublishing(async () => {
      const result = await unpublishChallengeAction(challenge.id, ws)
      if (!result.success && result.error) { setPublishErrors([result.error]); return }
      router.refresh()
    })
  }

  return (
    // `flex-1 w-full min-w-0` is load-bearing, not decoration. The workspace
    // layout is `lg:flex-row`, so this is a flex *item*: without a grow or an
    // explicit width it sizes to its content and leaves dead space down the
    // right of the viewport. `min-w-0` then lets the middle pane shrink instead
    // of being forced wide by a long block title.
    <div className="flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
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
          {/* Schedule and format are set here, not in the builder, and the
              builder is where a creator is when they realise the dates are
              wrong. */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Challenge settings"
            title="Challenge settings"
            asChild
          >
            <Link href={`/ws/${ws}/challenges/${challenge.slug}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

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

      {saveError && (
        <div role="alert" className="flex shrink-0 items-start gap-2.5 border-b border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-destructive">{saveError}</p>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="shrink-0 text-xs font-medium text-destructive/70 hover:text-destructive"
          >
            Dismiss
          </button>
        </div>
      )}

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

              {publishErrors.some((e) => e.startsWith('No step is published')) &&
                readyUnpublished.length > 0 && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={handlePublishReadyDays}
                    disabled={isPublishing}
                  >
                    {isPublishing
                      ? 'Publishing…'
                      : `Publish ${readyUnpublished.length} ready ${
                          readyUnpublished.length === 1 ? 'day' : 'days'
                        } and continue`}
                  </Button>
                )}
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
            onDeleteStep={handleDeleteStep}
            submissionCounts={Object.fromEntries(steps.map((s) => [s.id, s.submissionCount ?? 0]))}
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
            onDelete={() => handleDeleteStep(activeStep.id)}
            submissionCount={activeStep.submissionCount ?? 0}
          />
        )}
      </div>
    </div>
  )
}
