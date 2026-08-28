'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Monitor, Smartphone, Eye, Clock, Zap,
  CheckCircle, Lock, AlertCircle,
} from 'lucide-react'
import { ContentBlock, type RenderableBlock } from '@/components/challenge/content-blocks'
import { cn } from '@/lib/utils'

export interface PreviewStep {
  id: string
  title: string
  order: number
  isRequired: boolean
  isPublished: boolean
  estimatedMinutes: number | null
  pointsXp: number | null
  blocks: RenderableBlock[]
}

interface Props {
  workspaceSlug: string
  challengeSlug: string
  challengeTitle: string
  challengeStatus: string
  promise: string | null
  description: string | null
  steps: PreviewStep[]
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', Icon: Monitor,    width: 'max-w-3xl' },
  { key: 'mobile',  label: 'Mobile',  Icon: Smartphone, width: 'max-w-[400px]' },
] as const
type DeviceKey = (typeof DEVICES)[number]['key']

export function PreviewClient({
  workspaceSlug, challengeSlug, challengeTitle, challengeStatus,
  promise, description, steps,
}: Props) {
  const [device, setDevice] = useState<DeviceKey>('desktop')
  const [activeId, setActiveId] = useState(steps[0]?.id ?? '')

  const active = steps.find((s) => s.id === activeId) ?? steps[0]
  const frame = DEVICES.find((d) => d.key === device)!

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-100">

      {/* Preview chrome — deliberately unlike the participant view, so nobody
          mistakes the toolbar for part of the challenge. */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
        <Link
          href={`/ws/${workspaceSlug}/challenges/${challengeSlug}/builder`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to builder
        </Link>

        <span aria-hidden="true" className="h-4 w-px bg-slate-200" />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{challengeTitle}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Eye className="h-3 w-3" /> Preview — how a participant sees this
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Preview width">
          {DEVICES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key)}
              aria-pressed={device === key}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                device === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">

        {/* Step rail */}
        <nav aria-label="Steps" className="w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          <p className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Steps ({steps.length})
          </p>
          <ul className="pb-4">
            {steps.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  aria-current={s.id === active?.id ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-l-2 px-4 py-2.5 text-left transition-colors',
                    s.id === active?.id
                      ? 'border-indigo-600 bg-indigo-50/60'
                      : 'border-transparent hover:bg-slate-50'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm',
                      s.id === active?.id ? 'font-medium text-indigo-700' : 'text-slate-700')}>
                      {s.title}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {s.blocks.length} block{s.blocks.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  {/* An unpublished step is invisible to participants — the one
                      thing a preview must not hide. */}
                  {!s.isPublished && (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Not published" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* The participant's view, framed */}
        <div className="min-w-0 flex-1 overflow-y-auto p-8">
          <div className={cn('mx-auto w-full transition-all duration-300', frame.width)}>

            {challengeStatus === 'DRAFT' && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  This challenge is a draft. Nobody can reach it yet — publish it from the
                  builder when the content is ready.
                </span>
              </div>
            )}

            {!active ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">No steps yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  Add a step in the builder and its content will appear here.
                </p>
              </div>
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <header className="border-b border-slate-100 pb-5">
                  {promise && (
                    <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
                      {challengeTitle}
                    </p>
                  )}
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                    {active.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-500">
                    {active.estimatedMinutes != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {active.estimatedMinutes} min
                      </span>
                    )}
                    {active.pointsXp != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> {active.pointsXp} XP
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {active.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {description && active.order === 1 && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-600">{description}</p>
                  )}
                </header>

                <div className="space-y-6 pt-6">
                  {active.blocks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      This step has no content blocks yet.
                    </div>
                  ) : (
                    active.blocks.map((b) => (
                      // readOnly: the controls render exactly as a participant
                      // sees them but accept nothing, so a preview cannot write.
                      <ContentBlock key={b.id} block={b} readOnly />
                    ))
                  )}
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
