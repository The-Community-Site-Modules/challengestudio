'use client'

import { useState } from 'react'
import {
  Type, Video, Image as ImageIcon, Download, CheckSquare, ClipboardList,
  MessageSquare, Upload, BookOpen, Users, GripVertical,
  Trash2, ChevronDown, ChevronUp, Plus, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ─── Block type catalogue ─────────────────────────────────────────────────
export const BLOCK_TYPES = [
  { type: 'heading',          label: 'Heading / Text',     icon: <Type className="h-4 w-4" />,         color: 'bg-slate-100 text-slate-600' },
  { type: 'video',            label: 'Video',              icon: <Video className="h-4 w-4" />,         color: 'bg-red-100 text-red-600' },
  { type: 'image',            label: 'Image',              icon: <ImageIcon className="h-4 w-4" />,      color: 'bg-purple-100 text-purple-600' },
  { type: 'download',         label: 'Download',           icon: <Download className="h-4 w-4" />,      color: 'bg-blue-100 text-blue-600' },
  { type: 'checklist',        label: 'Checklist',          icon: <CheckSquare className="h-4 w-4" />,   color: 'bg-green-100 text-green-600' },
  { type: 'assignment',       label: 'Assignment',         icon: <ClipboardList className="h-4 w-4" />, color: 'bg-orange-100 text-orange-600' },
  { type: 'text_response',    label: 'Text Response',      icon: <MessageSquare className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-600' },
  { type: 'file_upload',      label: 'File Upload',        icon: <Upload className="h-4 w-4" />,        color: 'bg-cyan-100 text-cyan-600' },
  { type: 'reflection',       label: 'Reflection',         icon: <BookOpen className="h-4 w-4" />,      color: 'bg-indigo-100 text-indigo-600' },
  { type: 'discussion_prompt',label: 'Discussion Prompt',  icon: <Users className="h-4 w-4" />,         color: 'bg-pink-100 text-pink-600' },
]

interface ContentBlockUI {
  id: string
  type: string
  label: string
  payload: Record<string, string>
  required: boolean
  expanded: boolean
}

// ─── Individual block editors ─────────────────────────────────────────────
function BlockPayloadEditor({ block, onChange }: {
  block: ContentBlockUI
  onChange: (payload: Record<string, string>) => void
}) {
  const update = (key: string, val: string) => onChange({ ...block.payload, [key]: val })

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Heading text</Label>
            <Input placeholder="e.g. Welcome to Day 1" value={block.payload.heading ?? ''} onChange={e => update('heading', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Body text</Label>
            <Textarea placeholder="Lesson content, instructions, or context..." rows={4} value={block.payload.body ?? ''} onChange={e => update('body', e.target.value)} />
          </div>
        </div>
      )
    case 'video':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Video URL (YouTube or Vimeo)</Label>
            <Input placeholder="https://youtube.com/watch?v=..." value={block.payload.url ?? ''} onChange={e => update('url', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Caption (optional)</Label>
            <Input placeholder="Describe what participants will learn..." value={block.payload.caption ?? ''} onChange={e => update('caption', e.target.value)} />
          </div>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Click to upload or paste URL</p>
            <Button variant="outline" size="sm" className="mt-3">Upload image</Button>
          </div>
          <Input placeholder="Alt text for accessibility" value={block.payload.alt ?? ''} onChange={e => update('alt', e.target.value)} />
        </div>
      )
    case 'download':
      return (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
            <Download className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Upload workbook, PDF, or worksheet</p>
            <Button variant="outline" size="sm" className="mt-3">Upload file</Button>
          </div>
          <Input placeholder="Display name e.g. Day 1 Workbook.pdf" value={block.payload.name ?? ''} onChange={e => update('name', e.target.value)} />
        </div>
      )
    case 'checklist':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Checklist items (one per line)</Label>
          <Textarea
            placeholder={"Review your business idea\nWrite out your top 3 ideal clients\nPost your commitment in the community"}
            rows={4}
            value={block.payload.items ?? ''}
            onChange={e => update('items', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Each line becomes a checkable task for participants.</p>
        </div>
      )
    case 'assignment':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Assignment title</Label>
            <Input placeholder="e.g. Draft your Ideal Client Profile" value={block.payload.title ?? ''} onChange={e => update('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Instructions</Label>
            <Textarea placeholder="Describe exactly what participants need to do..." rows={4} value={block.payload.instructions ?? ''} onChange={e => update('instructions', e.target.value)} />
          </div>
        </div>
      )
    case 'text_response':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Prompt / question</Label>
            <Textarea placeholder="e.g. What is your single biggest obstacle to landing clients?" rows={3} value={block.payload.prompt ?? ''} onChange={e => update('prompt', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Response type</Label>
            <div className="flex gap-2">
              {['Short answer', 'Long answer'].map(t => (
                <button
                  key={t}
                  onClick={() => update('responseType', t)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    block.payload.responseType === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      )
    case 'reflection':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Reflection prompt</Label>
            <Textarea placeholder="e.g. What did you learn today? What will you do differently tomorrow?" rows={3} value={block.payload.prompt ?? ''} onChange={e => update('prompt', e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-xs font-medium text-foreground">Private reflection</p>
              <p className="text-xs text-muted-foreground">Only the participant can see their response.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      )
    case 'discussion_prompt':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Discussion prompt</Label>
            <Textarea placeholder="e.g. Share your Ideal Client Profile below and give feedback to 2 others!" rows={3} value={block.payload.prompt ?? ''} onChange={e => update('prompt', e.target.value)} />
          </div>
        </div>
      )
    case 'file_upload':
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Upload prompt</Label>
            <Input placeholder="e.g. Upload a photo of your completed worksheet" value={block.payload.prompt ?? ''} onChange={e => update('prompt', e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Accepted: images, PDFs, Word docs. Max 50MB.</p>
        </div>
      )
    default:
      return <p className="text-xs text-muted-foreground">Configure this block above.</p>
  }
}

// ─── Block card ───────────────────────────────────────────────────────────
function BlockCard({ block, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: ContentBlockUI
  onUpdate: (id: string, changes: Partial<ContentBlockUI>) => void
  onRemove: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  isFirst: boolean
  isLast: boolean
}) {
  const meta = BLOCK_TYPES.find(b => b.type === block.type)

  return (
    <div className={cn(
      'group rounded-xl border bg-card transition-shadow hover:shadow-sm',
      block.expanded ? 'border-primary/30' : 'border-border'
    )}>
      {/* Block header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', meta?.color)}>
          {meta?.icon}
        </div>
        <span className="flex-1 text-sm font-medium text-foreground">{meta?.label}</span>

        {block.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            disabled={isFirst}
            onClick={() => onMoveUp(block.id)}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={isLast}
            onClick={() => onMoveDown(block.id)}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRemove(block.id)}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
            aria-label="Remove block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={() => onUpdate(block.id, { expanded: !block.expanded })}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          {block.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded editor */}
      {block.expanded && (
        <div className="border-t border-border px-4 pb-4 pt-4 space-y-4">
          <BlockPayloadEditor
            block={block}
            onChange={(payload) => onUpdate(block.id, { payload })}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-3">
            <div>
              <p className="text-xs font-medium text-foreground">Mark as required</p>
              <p className="text-xs text-muted-foreground">Participant must complete this to finish the day.</p>
            </div>
            <Switch
              checked={block.required}
              onCheckedChange={(v) => onUpdate(block.id, { required: v })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add block picker ─────────────────────────────────────────────────────
function AddBlockPicker({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed"
        onClick={() => setOpen(!open)}
      >
        <Plus className="h-4 w-4" /> Add content block
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-10 rounded-xl border border-border bg-card shadow-lg p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose block type</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => { onAdd(bt.type); setOpen(false) }}
                className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 text-left text-sm hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', bt.color)}>
                  {bt.icon}
                </div>
                <span className="text-xs font-medium text-foreground">{bt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main block editor area ───────────────────────────────────────────────

export interface BlockItem {
  id:       string
  type:     string
  label:    string
  payload:  Record<string, string>
  required: boolean
  expanded: boolean
}

interface ContentBlockEditorProps {
  initialBlocks?: BlockItem[]
  onSave?:   (blocks: BlockItem[]) => void
  isSaving?: boolean
}

export function ContentBlockEditor({ initialBlocks, onSave, isSaving }: ContentBlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockItem[]>(() => {
    if (initialBlocks && initialBlocks.length > 0) return initialBlocks
    return []
  })

  const updateBlock = (id: string, changes: Partial<BlockItem>) =>
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b))

  const removeBlock = (id: string) =>
    setBlocks(bs => bs.filter(b => b.id !== id))

  const moveUp = (id: string) => {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      if (i === 0) return bs
      const arr = [...bs]
      ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
      return arr
    })
  }

  const moveDown = (id: string) => {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id)
      if (i === bs.length - 1) return bs
      const arr = [...bs]
      ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
      return arr
    })
  }

  const addBlock = (type: string) => {
    const meta = BLOCK_TYPES.find(b => b.type === type)
    if (!meta) return
    const newBlock: BlockItem = {
      id:       `b${Date.now()}`,
      type,
      label:    meta.label,
      payload:  {},
      required: false,
      expanded: true,
    }
    setBlocks(bs => [...bs, newBlock])
  }

  function handleSave() {
    if (onSave) onSave(blocks)
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          onUpdate={updateBlock}
          onRemove={removeBlock}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
        />
      ))}
      <AddBlockPicker onAdd={addBlock} />
      {onSave && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
            {isSaving ? 'Saving…' : 'Save blocks'}
          </Button>
        </div>
      )}
    </div>
  )
}
