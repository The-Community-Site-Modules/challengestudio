'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle, Clock, Zap,
  Play, Download, Users, BookOpen, Upload,
  MessageCircle,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Progress }  from '@/components/ui/progress'
import { Textarea }  from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox }  from '@/components/ui/checkbox'
import { Switch }    from '@/components/ui/switch'
import { cn }        from '@/lib/utils'
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

// ─── Individual block renderers ───────────────────────────────────────────

function VideoBlock({ data }: { data: Record<string, string> }) {
  const [playing, setPlaying] = useState(false)

  // Convert YouTube/Vimeo watch URLs to embed URLs
  function toEmbedUrl(url: string): string {
    if (!url) return ''
    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
    // Vimeo: vimeo.com/ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    return url // fallback: use as-is
  }

  const embedUrl = data.url ? toEmbedUrl(data.url) : ''

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black">
      <div className="relative aspect-video flex items-center justify-center">
        {!playing ? (
          <div className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black"
            onClick={() => embedUrl && setPlaying(true)}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl hover:scale-105 transition-transform">
              <Play className="h-7 w-7 text-primary translate-x-0.5" />
            </div>
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-semibold">{data.caption ?? 'Watch the lesson'}</p>
            </div>
          </div>
        ) : embedUrl ? (
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={data.caption ?? 'Video'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <p className="text-white/60 text-sm">No video URL configured</p>
          </div>
        )}
      </div>
    </div>
  )
}

function HeadingBlock({ data }: { data: Record<string, string> }) {
  return (
    <div className="prose prose-sm max-w-none">
      {data.heading && <h2 className="text-xl font-bold text-foreground mb-3">{data.heading}</h2>}
      {data.body    && <p className="text-muted-foreground leading-relaxed">{data.body}</p>}
    </div>
  )
}

function DownloadBlock({ data }: { data: Record<string, string> }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{data.name ?? 'Download'}</p>
      </div>
      {data.url ? (
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <a href={data.url} download><Download className="h-3.5 w-3.5" /> Download</a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" className="gap-1.5" disabled>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      )}
    </div>
  )
}

function ChecklistBlock({ data, blockId, onInteract }: {
  data: Record<string, string>
  blockId: string
  onInteract: (id: string, v: unknown) => void
}) {
  const items = (data.items ?? '').split('\n').filter(Boolean)
  const [checked, setChecked] = useState<string[]>([])
  const toggle = (item: string) => {
    const next = checked.includes(item) ? checked.filter(i => i !== item) : [...checked, item]
    setChecked(next)
    onInteract(blockId, next)
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Checklist</p>
        <Badge variant={checked.length === items.length && items.length > 0 ? 'success' : 'secondary'}>
          {checked.length}/{items.length}
        </Badge>
      </div>
      <Progress value={items.length > 0 ? (checked.length / items.length) * 100 : 0} className="h-1.5" />
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <Checkbox id={`${blockId}-${item}`} checked={checked.includes(item)}
              onCheckedChange={() => toggle(item)} className="mt-0.5" />
            <label htmlFor={`${blockId}-${item}`}
              className={cn('text-sm cursor-pointer', checked.includes(item) ? 'line-through text-muted-foreground' : 'text-foreground')}>
              {item}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssignmentBlock({ data, blockId, onInteract }: {
  data: Record<string, string>
  blockId: string
  onInteract: (id: string, v: unknown) => void
}) {
  const [value, setValue] = useState('')
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{data.title ?? 'Assignment'}</p>
          {data.instructions && <p className="mt-1 text-sm text-muted-foreground">{data.instructions}</p>}
        </div>
      </div>
      <Textarea placeholder="Write your response here..." rows={4} value={value}
        onChange={e => { setValue(e.target.value); onInteract(blockId, e.target.value) }}
        className="bg-white" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{wordCount} words</p>
        <Badge variant="outline" className="text-xs">Required</Badge>
      </div>
    </div>
  )
}

function ReflectionBlock({ data, blockId, onInteract }: {
  data: Record<string, string>
  blockId: string
  onInteract: (id: string, v: unknown) => void
}) {
  const [value, setValue]    = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Reflection</p>
          {data.prompt && <p className="mt-1 text-sm text-muted-foreground">{data.prompt}</p>}
        </div>
      </div>
      <Textarea
        placeholder="Write your reflection here..."
        rows={4}
        className="bg-white"
        value={value}
        onChange={e => { setValue(e.target.value); onInteract(blockId, { text: e.target.value, isPrivate }) }}
      />
      <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-white/70 px-3 py-2">
        <p className="text-xs font-medium text-foreground">
          {isPrivate ? '🔒 Private' : '👁 Visible to facilitators'}
        </p>
        <Switch checked={isPrivate} onCheckedChange={v => { setIsPrivate(v); onInteract(blockId, { text: value, isPrivate: v }) }} />
      </div>
    </div>
  )
}

function DiscussionBlock({ data }: { data: Record<string, string> }) {
  return (
    <div className="rounded-xl border border-pink-200 bg-pink-50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Community Discussion</p>
          {data.prompt && <p className="mt-1 text-sm text-muted-foreground">{data.prompt}</p>}
        </div>
      </div>
      <Textarea placeholder="Share your response..." rows={3} className="bg-white" />
      <Button size="sm" className="gap-2">
        <MessageCircle className="h-3.5 w-3.5" /> Post to feed
      </Button>
    </div>
  )
}

function TextResponseBlock({ data, blockId, onInteract }: {
  data: Record<string, string>
  blockId: string
  onInteract: (id: string, v: unknown) => void
}) {
  const [value, setValue] = useState('')
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 space-y-3">
      {data.prompt && <p className="text-sm font-medium text-foreground">{data.prompt}</p>}
      <Textarea placeholder="Your answer..." rows={3} value={value}
        onChange={e => { setValue(e.target.value); onInteract(blockId, e.target.value) }}
        className="bg-white" />
    </div>
  )
}

function FileUploadBlock({ data }: { data: Record<string, string> }) {
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
          <Upload className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">File Upload</p>
          {data.prompt && <p className="mt-1 text-sm text-muted-foreground">{data.prompt}</p>}
        </div>
      </div>
      <div className="rounded-lg border-2 border-dashed border-cyan-300 bg-white p-6 text-center">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Click to upload · PDF, images · Max 50MB</p>
        <Button variant="outline" size="sm" className="mt-3">Choose file</Button>
      </div>
    </div>
  )
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
            switch (block.type) {
              case 'video':             return <VideoBlock         key={block.id} data={block.data} />
              case 'heading':           return <HeadingBlock       key={block.id} data={block.data} />
              case 'download':          return <DownloadBlock      key={block.id} data={block.data} />
              case 'checklist':         return <ChecklistBlock     key={block.id} data={block.data} blockId={block.id} onInteract={handleBlockInteract} />
              case 'assignment':        return <AssignmentBlock    key={block.id} data={block.data} blockId={block.id} onInteract={handleBlockInteract} />
              case 'text_response':     return <TextResponseBlock  key={block.id} data={block.data} blockId={block.id} onInteract={handleBlockInteract} />
              case 'reflection':        return <ReflectionBlock    key={block.id} data={block.data} blockId={block.id} onInteract={handleBlockInteract} />
              case 'discussion_prompt': return <DiscussionBlock    key={block.id} data={block.data} />
              case 'file_upload':       return <FileUploadBlock    key={block.id} data={block.data} />
              default:                  return <HeadingBlock       key={block.id} data={block.data} />
            }
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
