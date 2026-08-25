'use client'

import { useState } from 'react'
import {
  Plus, GripVertical, Trash2, ChevronDown,
  ChevronRight, CheckCircle, Clock, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type StepStatus = 'published' | 'draft' | 'empty'

export interface BuilderStep {
  id:              string
  position:        number
  order:           number
  type:            'orientation' | 'day' | 'graduation' | 'bonus'
  stepType:        string
  title:           string
  status:          StepStatus
  blockCount:      number
  isRequired:      boolean
  isPublished:     boolean
  estimatedMinutes?: number | null
  completionMethod?: string | null
  pointsXp?:        number | null
  availableAt?:    unknown
  dueAt?:          unknown
}

const statusIcon: Record<StepStatus, React.ReactNode> = {
  published: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  draft:     <Clock className="h-3.5 w-3.5 text-yellow-500" />,
  empty:     <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />,
}

interface BuilderSidebarProps {
  activeStepId: string
  onSelectStep: (id: string) => void
  steps:        BuilderStep[]
  onAddStep:    () => void
  onDeleteStep: (id: string) => void
  onReorder:    (orderedIds: string[]) => void
}

export function BuilderSidebar({
  activeStepId, onSelectStep, steps,
  onAddStep, onDeleteStep, onReorder,
}: BuilderSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  // Simple drag-to-reorder
  function handleDragStart(id: string) { setDragId(id) }
  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) return
    const from = steps.findIndex(s => s.id === dragId)
    const to   = steps.findIndex(s => s.id === targetId)
    if (from === -1 || to === -1) return
    const reordered = [...steps]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered.map(s => s.id))
  }
  function handleDragEnd() { setDragId(null) }

  // Derive display status from isPublished + blockCount
  function getStatus(step: BuilderStep): StepStatus {
    if (step.isPublished) return 'published'
    if (step.blockCount > 0) return 'draft'
    return 'empty'
  }

  return (
    <div className={cn(
      'flex flex-col border-r border-border bg-card transition-all duration-200',
      collapsed ? 'w-12' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {!collapsed && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Steps ({steps.length})
          </p>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Step list */}
          <div className="flex-1 overflow-y-auto py-2">
            {steps.map((step) => {
              const status = getStatus(step)
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(step.id)}
                  onDragOver={e => handleDragOver(e, step.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex w-full items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors',
                    activeStepId === step.id
                      ? 'bg-primary/5 border-r-2 border-primary'
                      : 'hover:bg-muted',
                    dragId === step.id && 'opacity-40'
                  )}
                  onClick={() => onSelectStep(step.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectStep(step.id)}
                >
                  <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[status]}
                      <span className={cn(
                        'text-xs font-medium truncate',
                        activeStepId === step.id ? 'text-primary' : 'text-foreground'
                      )}>
                        {step.title}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="outline" className="px-1 py-0 text-[10px] capitalize">
                        {step.stepType}
                      </Badge>
                      {step.blockCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {step.blockCount} blocks
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button — only on hover, not owner */}
                  {!step.isRequired && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteStep(step.id) }}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete step"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add step */}
          <div className="border-t border-border p-3">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={onAddStep}>
              <Plus className="h-3.5 w-3.5" /> Add step
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
