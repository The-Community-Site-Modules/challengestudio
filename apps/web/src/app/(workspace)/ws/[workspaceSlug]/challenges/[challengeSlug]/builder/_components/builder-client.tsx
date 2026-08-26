'use client'

import Link from 'next/link'

import { useState, useTransition } from 'react'
import { Eye, Send, Loader2, AlertCircle } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch }    from '@/components/ui/switch'
import { Badge }     from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BuilderSidebar, type BuilderStep } from '@/components/challenge/builder-sidebar'
import { ContentBlockEditor, type BlockItem } from '@/components/challenge/content-block-editor'
import {
  addStepAction, updateStepAction, deleteStepAction,
  reorderStepsAction, saveBlocksAction, publishChallengeAction,
} from '../../../actions'

interface Props {
  challenge: {
    id:           string
    title:        string
    slug:         string
    status:       string
    workspaceSlug: string
  }
  initialSteps: (BuilderStep & { blocks: BlockItem[] })[]
}

export function BuilderClient({ challenge, initialSteps }: Props) {
  const [steps,        setSteps]        = useState<(BuilderStep & { blocks: BlockItem[] })[]>(initialSteps)
  const [activeStepId, setActiveStepId] = useState(initialSteps[0]?.id ?? '')
  const [stepTitle,    setStepTitle]    = useState(initialSteps[0]?.title ?? '')
  const [isSaving,     startSaving]     = useTransition()
  const [isPublishing, startPublishing] = useTransition()
  const [publishErrors, setPublishErrors] = useState<string[]>([])

  const ws = challenge.workspaceSlug
  const activeStep = steps.find(s => s.id === activeStepId)

  // ── Select step ─────────────────────────────────────────────────────
  function handleSelectStep(id: string) {
    setActiveStepId(id)
    const s = steps.find(x => x.id === id)
    if (s) setStepTitle(s.title)
  }

  // ── Add step ─────────────────────────────────────────────────────────
  function handleAddStep() {
    startSaving(async () => {
      const result = await addStepAction(challenge.id, ws)
      const newStep: BuilderStep & { blocks: BlockItem[] } = {
        id:              result.id,
        position:        steps.length,
        order:           result.order,
        type:            'day',
        stepType:        'day',
        title:           result.title,
        status:          'empty',
        blockCount:      0,
        isRequired:      true,
        isPublished:     false,
        blocks:          [],
      }
      setSteps(prev => [...prev, newStep])
      handleSelectStep(result.id)
    })
  }

  // ── Save step title ──────────────────────────────────────────────────
  function handleStepTitleBlur() {
    if (!activeStep || stepTitle === activeStep.title) return
    startSaving(async () => {
      await updateStepAction(activeStep.id, ws, { title: stepTitle })
      setSteps(prev => prev.map(s => s.id === activeStep.id ? { ...s, title: stepTitle } : s))
    })
  }

  // ── Save blocks ──────────────────────────────────────────────────────
  function handleSaveBlocks(blocks: BlockItem[]) {
    if (!activeStep) return
    startSaving(async () => {
      await saveBlocksAction(activeStep.id, ws, blocks.map((b, i) => ({
        id:       b.id,
        type:     b.type,
        order:    i,
        data:     b.payload as Record<string, unknown>,
        required: b.required,
      })))
      setSteps(prev => prev.map(s =>
        s.id === activeStep.id
          ? { ...s, blocks, blockCount: blocks.length, status: blocks.length > 0 ? 'draft' : 'empty' }
          : s
      ))
    })
  }

  // ── Delete step ──────────────────────────────────────────────────────
  function handleDeleteStep(id: string) {
    startSaving(async () => {
      await deleteStepAction(id, ws)
      const remaining = steps.filter(s => s.id !== id)
      setSteps(remaining)
      if (activeStepId === id) {
        const next = remaining[0]
        if (next) handleSelectStep(next.id)
        else { setActiveStepId(''); setStepTitle('') }
      }
    })
  }

  // ── Reorder steps ────────────────────────────────────────────────────
  function handleReorder(orderedIds: string[]) {
    const reordered = orderedIds.map((id, i) => {
      const s = steps.find(x => x.id === id)!
      return { ...s, order: i, position: i }
    })
    setSteps(reordered)
    startSaving(async () => {
      await reorderStepsAction(challenge.id, ws, orderedIds)
    })
  }

  // ── Publish ──────────────────────────────────────────────────────────
  function handlePublish() {
    startPublishing(async () => {
      const result = await publishChallengeAction(challenge.id, ws)
      if (!result.success) setPublishErrors(result.errors)
    })
  }

  const canPublish = challenge.status !== 'PUBLISHED' && challenge.status !== 'ACTIVE'

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <BuilderSidebar
        activeStepId={activeStepId}
        onSelectStep={handleSelectStep}
        steps={steps}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        onReorder={handleReorder}
      />

      {/* Center editor */}
      <main className="flex-1 overflow-y-auto">
        {/* Action bar */}
        <div className="flex items-center justify-end gap-2 border-b border-border px-4 py-2">
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/ws/${ws}/challenges/${challenge.slug}/preview`}>
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </Button>
          {canPublish && (
            <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                : <><Send className="h-4 w-4" /> Publish</>}
            </Button>
          )}
        </div>

        {/* Every reason at once. Showing only the first sends the creator round
            the loop once per problem. */}
        {publishErrors.length > 0 && (
          <div role="alert" className="border-b border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
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

        {activeStep ? (
          <div className="mx-auto max-w-3xl px-8 py-8">
            {/* Step header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary" className="capitalize">{activeStep.stepType}</Badge>
                <Badge variant={activeStep.isPublished ? 'success' : 'warning'}>
                  {activeStep.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Step title (shown to participants)</Label>
                <Input
                  className="text-lg font-bold border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
                  value={stepTitle}
                  onChange={e => setStepTitle(e.target.value)}
                  onBlur={handleStepTitleBlur}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="content" className="mb-8">
              <TabsList className="mb-6">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <ContentBlockEditor
                  initialBlocks={activeStep.blocks}
                  onSave={handleSaveBlocks}
                  isSaving={isSaving}
                />
              </TabsContent>

              <TabsContent value="settings">
                <StepSettingsPanel step={activeStep} ws={ws} onUpdate={(data) => {
                  startSaving(async () => {
                    await updateStepAction(activeStep.id, ws, data)
                    setSteps(prev => prev.map(s => s.id === activeStep.id ? { ...s, ...data } : s))
                  })
                }} />
              </TabsContent>

              <TabsContent value="schedule">
                <StepSchedulePanel step={activeStep} ws={ws} onUpdate={(data) => {
                  startSaving(async () => {
                    await updateStepAction(activeStep.id, ws, data)
                  })
                }} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No steps yet</p>
              <p className="text-sm mt-1">Add your first step using the sidebar.</p>
            </div>
          </div>
        )}
      </main>

      {/* Right summary panel */}
      <aside className="hidden w-52 shrink-0 border-l border-border bg-card xl:block">
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step summary</p>
          {activeStep && (
            <>
              {[
                { label: 'Status',    value: activeStep.isPublished ? 'Published' : 'Draft' },
                { label: 'Blocks',    value: `${activeStep.blockCount} blocks` },
                { label: 'Required',  value: activeStep.isRequired ? 'Yes' : 'No' },
                { label: 'Est. time', value: activeStep.estimatedMinutes ? `${activeStep.estimatedMinutes} min` : '—' },
                { label: 'Points',    value: activeStep.pointsXp ? `${activeStep.pointsXp} XP` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

// ─── Step settings panel ──────────────────────────────────────────────────────
function StepSettingsPanel({ step, ws: _ws, onUpdate }: {
  step: BuilderStep
  ws:   string
  onUpdate: (data: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground">Step settings</h3>
      <Separator />

      {/* The one setting that decides whether anybody can see this step. The
          column existed and the sidebar showed a Draft badge, but nothing could
          change it — so every step stayed invisible to participants. */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Published</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {step.isPublished
              ? 'Participants can see this step once it unlocks.'
              : 'Hidden from participants, even after the challenge is live.'}
          </p>
        </div>
        <Switch
          checked={step.isPublished}
          onCheckedChange={v => onUpdate({ isPublished: v })}
          aria-label="Step is published"
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Required</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {step.isRequired
              ? 'Counts towards completing the challenge.'
              : 'Optional — participants can skip it.'}
          </p>
        </div>
        <Switch
          checked={step.isRequired}
          onCheckedChange={v => onUpdate({ isRequired: v })}
          aria-label="Step is required"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Estimated time</Label>
        <Select
          defaultValue={step.estimatedMinutes?.toString() ?? '30'}
          onValueChange={v => onUpdate({ estimatedMinutes: parseInt(v) })}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['15', '30', '45', '60', '90', '120'].map(m => (
              <SelectItem key={m} value={m}>{m} minutes</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Completion method</Label>
        <Select
          defaultValue={step.completionMethod ?? 'required_blocks'}
          onValueChange={v => onUpdate({ completionMethod: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual — participant clicks &quot;Complete&quot;</SelectItem>
            <SelectItem value="required_blocks">Required blocks must be completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Points (XP)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            defaultValue={step.pointsXp ?? 100}
            className="w-28"
            onBlur={e => onUpdate({ pointsXp: parseInt(e.target.value) || 0 })}
          />
          <span className="text-sm text-muted-foreground">XP</span>
        </div>
      </div>
    </div>
  )
}

// ─── Step schedule panel ──────────────────────────────────────────────────────
function StepSchedulePanel({ step, ws: _ws, onUpdate }: {
  step: BuilderStep
  ws:   string
  onUpdate: (data: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground">Unlock schedule</h3>
      <Separator />
      <div className="space-y-1.5">
        <Label>Override unlock date/time (optional)</Label>
        <Input
          type="datetime-local"
          defaultValue={step.availableAt ? new Date(step.availableAt as string).toISOString().slice(0,16) : ''}
          onBlur={e => onUpdate({ availableAt: e.target.value || null })}
        />
        <p className="text-xs text-muted-foreground">Leave blank to use challenge start date + step order.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Due date/time (optional)</Label>
        <Input
          type="datetime-local"
          defaultValue={step.dueAt ? new Date(step.dueAt as string).toISOString().slice(0,16) : ''}
          onBlur={e => onUpdate({ dueAt: e.target.value || null })}
        />
      </div>
    </div>
  )
}
