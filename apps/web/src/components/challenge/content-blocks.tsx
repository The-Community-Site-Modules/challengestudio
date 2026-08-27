'use client'

import { useState } from 'react'
import {
  Play, Download, Users, BookOpen, Upload, Zap, MessageCircle, Image as ImageIcon,
} from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch }   from '@/components/ui/switch'
import { cn }       from '@/lib/utils'

/**
 * How a content block looks to a participant.
 *
 * One implementation, two callers: the day page passes `onInteract` and gets
 * working controls; the builder's preview passes `readOnly` and gets the same
 * markup with the controls inert. Two copies would let the preview drift from
 * the thing it exists to preview, which is its only job.
 */

export interface RenderableBlock {
  id: string
  type: string
  data: Record<string, string>
}

type Interact = (id: string, value: unknown) => void

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

function ChecklistBlock({ data, blockId, onInteract, readOnly }: {
  data: Record<string, string>
  blockId: string
  onInteract?: Interact
  readOnly?: boolean
}) {
  const items = (data.items ?? '').split('\n').filter(Boolean)
  const [checked, setChecked] = useState<string[]>([])
  const toggle = (item: string) => {
    const next = checked.includes(item) ? checked.filter(i => i !== item) : [...checked, item]
    setChecked(next)
    onInteract?.(blockId, next)
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
              onCheckedChange={() => toggle(item)} disabled={readOnly} className="mt-0.5" />
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

function AssignmentBlock({ data, blockId, onInteract, readOnly }: {
  data: Record<string, string>
  blockId: string
  onInteract?: Interact
  readOnly?: boolean
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
        onChange={e => { setValue(e.target.value); onInteract?.(blockId, e.target.value) }}
        disabled={readOnly} className="bg-white" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{wordCount} words</p>
        <Badge variant="outline" className="text-xs">Required</Badge>
      </div>
    </div>
  )
}

function ReflectionBlock({ data, blockId, onInteract, readOnly }: {
  data: Record<string, string>
  blockId: string
  onInteract?: Interact
  readOnly?: boolean
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
        disabled={readOnly}
        onChange={e => { setValue(e.target.value); onInteract?.(blockId, { text: e.target.value, isPrivate }) }}
      />
      <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-white/70 px-3 py-2">
        <p className="text-xs font-medium text-foreground">
          {isPrivate ? '🔒 Private' : '👁 Visible to facilitators'}
        </p>
        <Switch checked={isPrivate} disabled={readOnly} onCheckedChange={v => { setIsPrivate(v); onInteract?.(blockId, { text: value, isPrivate: v }) }} />
      </div>
    </div>
  )
}

function DiscussionBlock({ data, readOnly }: { data: Record<string, string>; readOnly?: boolean }) {
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
      <Textarea placeholder="Share your response..." rows={3} disabled={readOnly} className="bg-white" />
      <Button size="sm" className="gap-2" disabled={readOnly}>
        <MessageCircle className="h-3.5 w-3.5" /> Post to feed
      </Button>
    </div>
  )
}

function TextResponseBlock({ data, blockId, onInteract, readOnly }: {
  data: Record<string, string>
  blockId: string
  onInteract?: Interact
  readOnly?: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 space-y-3">
      {data.prompt && <p className="text-sm font-medium text-foreground">{data.prompt}</p>}
      <Textarea placeholder="Your answer..." rows={3} value={value}
        onChange={e => { setValue(e.target.value); onInteract?.(blockId, e.target.value) }}
        disabled={readOnly} className="bg-white" />
    </div>
  )
}

function FileUploadBlock({ data }: { data: Record<string, string>; readOnly?: boolean }) {
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
      {/* No drop zone and no "Choose file" button. File storage is not
          configured (OD-02 is still an open decision), so any control here
          would be one that cannot do anything — and a participant who clicked
          it would think their work had been handed in. Say so instead. */}
      <div className="rounded-lg border border-dashed border-cyan-300 bg-white px-5 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          File uploads are not available yet.
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground/80">
          Your host will tell you where to send this in the meantime.
        </p>
      </div>
    </div>
  )
}


// The editor offers an image block but the day page never rendered one, so
// anything a creator added here was invisible to participants.
function ImageBlock({ data }: { data: Record<string, string> }) {
  if (!data.url) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        <ImageIcon className="h-5 w-5 shrink-0" />
        No image URL configured
      </div>
    )
  }
  return (
    <figure className="overflow-hidden rounded-2xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.url} alt={data.caption ?? ''} className="w-full object-cover" />
      {data.caption && (
        <figcaption className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {data.caption}
        </figcaption>
      )}
    </figure>
  )
}


/** Renders one block. Pass `onInteract` for a live step, `readOnly` for preview. */
export function ContentBlock({ block, onInteract, readOnly }: {
  block: RenderableBlock
  onInteract?: Interact
  readOnly?: boolean
}) {
  const { type, data, id } = block

  switch (type) {
    case 'heading':           return <HeadingBlock      data={data} />
    case 'video':             return <VideoBlock        data={data} />
    case 'image':             return <ImageBlock        data={data} />
    case 'download':          return <DownloadBlock     data={data} />
    case 'discussion_prompt': return <DiscussionBlock   data={data} readOnly={readOnly} />
    case 'file_upload':       return <FileUploadBlock   data={data} readOnly={readOnly} />
    case 'checklist':         return <ChecklistBlock    data={data} blockId={id} onInteract={onInteract} readOnly={readOnly} />
    case 'assignment':        return <AssignmentBlock   data={data} blockId={id} onInteract={onInteract} readOnly={readOnly} />
    case 'text_response':     return <TextResponseBlock data={data} blockId={id} onInteract={onInteract} readOnly={readOnly} />
    case 'reflection':        return <ReflectionBlock   data={data} blockId={id} onInteract={onInteract} readOnly={readOnly} />
    // An unknown type means the editor gained a block this renderer has not
    // learned yet. Say so rather than silently rendering nothing.
    default:
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Unsupported block type &ldquo;{type}&rdquo;.
        </div>
      )
  }
}
