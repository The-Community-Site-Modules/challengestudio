'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, Trash2, Video, Radio, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  createSessionAction, updateSessionAction, deleteSessionAction, type SessionInput,
} from '../actions'

export interface SessionRow {
  id: string
  title: string
  description: string
  startsAt: string
  durationMinutes: string
  hostName: string
  joinUrl: string
  replayUrl: string
}

interface Props {
  workspaceSlug: string
  challengeSlug: string
  sessions: SessionRow[]
}

const EMPTY: SessionInput = {
  title: '', description: '', startsAt: '', durationMinutes: '', hostName: '',
  joinUrl: '', replayUrl: '',
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

export function SessionsClient({ workspaceSlug, challengeSlug, sessions }: Props) {
  const [adding, setAdding] = useState(false)

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[13px] text-slate-500">
          {sessions.length} session{sessions.length === 1 ? '' : 's'}
        </p>
        {!adding && (
          <Button
            type="button"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add session
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">New session</h2>
          <Form
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            initial={EMPTY}
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      {sessions.length === 0 && !adding ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <Radio className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
            No live sessions
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
            Add one and participants will see it in their hub, with a calendar
            file and the join link when it is time.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              workspaceSlug={workspaceSlug}
              challengeSlug={challengeSlug}
            />
          ))}
        </div>
      )}
    </>
  )
}

function SessionCard({ session, workspaceSlug, challengeSlug }: {
  session: SessionRow
  workspaceSlug: string
  challengeSlug: string
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [isBusy, start] = useTransition()

  const past = new Date(session.startsAt) < new Date()

  return (
    <div className={cn('rounded-xl border bg-white', past ? 'border-slate-200' : 'border-slate-200')}>
      <div className="flex items-start gap-3 p-5">
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1',
          past ? 'bg-slate-50 text-slate-400 ring-slate-100' : 'bg-indigo-50 text-indigo-600 ring-indigo-100'
        )}>
          {past && session.replayUrl ? <Video className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{session.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {when(session.startsAt)}
            </span>
            {session.durationMinutes && <span>{session.durationMinutes} min</span>}
            {session.hostName && <span>with {session.hostName}</span>}
            {past && <span className="text-slate-400">past</span>}
          </p>
          {!session.joinUrl && !past && (
            <p className="mt-1.5 text-[13px] text-amber-700">
              No join link yet — participants will see the time but no way in.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button" size="sm" variant="ghost"
            onClick={() => setEditing(v => !v)}
            className="h-8 px-2.5 text-[13px]"
          >
            {editing ? 'Close' : 'Edit'}
          </Button>
          {confirming ? (
            <>
              <Button
                type="button" size="sm" variant="outline"
                disabled={isBusy}
                onClick={() => start(async () => {
                  await deleteSessionAction(workspaceSlug, challengeSlug, session.id)
                })}
                className="h-8 border-red-200 px-2.5 text-[13px] text-red-700 hover:bg-red-50"
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
              </Button>
              <Button
                type="button" size="sm" variant="ghost"
                onClick={() => setConfirming(false)}
                className="h-8 px-2 text-[13px]"
              >
                Cancel
              </Button>
            </>
          ) : (
            <button
              type="button"
              title="Delete this session"
              onClick={() => setConfirming(true)}
              className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-600"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-5">
          <Form
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            initial={session}
            sessionId={session.id}
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  )
}

function Form({ workspaceSlug, challengeSlug, initial, sessionId, onDone }: {
  workspaceSlug: string
  challengeSlug: string
  initial: SessionInput
  sessionId?: string
  onDone: () => void
}) {
  const [form, setForm] = useState<SessionInput>(initial)
  const [isBusy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof SessionInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit() {
    setError(null)
    start(async () => {
      const r = sessionId
        ? await updateSessionAction(workspaceSlug, challengeSlug, sessionId, form)
        : await createSessionAction(workspaceSlug, challengeSlug, form)
      if (r.success) onDone()
      else setError(r.error ?? 'Could not save that.')
    })
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <Label htmlFor={`t-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">Title</Label>
        <Input id={`t-${sessionId ?? 'new'}`} value={form.title} onChange={set('title')}
          placeholder="Week 1 kickoff call" disabled={isBusy} className="mt-1.5 bg-white text-sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`d-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">
            Date and time
          </Label>
          <Input id={`d-${sessionId ?? 'new'}`} type="datetime-local" value={form.startsAt}
            onChange={set('startsAt')} disabled={isBusy} className="mt-1.5 bg-white text-sm" />
        </div>
        <div>
          <Label htmlFor={`m-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">
            Length (minutes)
          </Label>
          <Input id={`m-${sessionId ?? 'new'}`} type="number" min={1} value={form.durationMinutes}
            onChange={set('durationMinutes')} placeholder="60" disabled={isBusy}
            className="mt-1.5 bg-white text-sm" />
        </div>
      </div>

      <div>
        <Label htmlFor={`h-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">Host</Label>
        <Input id={`h-${sessionId ?? 'new'}`} value={form.hostName} onChange={set('hostName')}
          placeholder="Who is running it" disabled={isBusy} className="mt-1.5 bg-white text-sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`j-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">
            Join link
          </Label>
          <Input id={`j-${sessionId ?? 'new'}`} type="url" value={form.joinUrl} onChange={set('joinUrl')}
            placeholder="https://…" disabled={isBusy} className="mt-1.5 bg-white text-sm" />
          <p className="mt-1 text-[12px] text-slate-500">Shown only to enrolled participants.</p>
        </div>
        <div>
          <Label htmlFor={`r-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">
            Replay link
          </Label>
          <Input id={`r-${sessionId ?? 'new'}`} type="url" value={form.replayUrl} onChange={set('replayUrl')}
            placeholder="https://…" disabled={isBusy} className="mt-1.5 bg-white text-sm" />
        </div>
      </div>

      <div>
        <Label htmlFor={`n-${sessionId ?? 'new'}`} className="text-[13px] font-medium text-slate-700">
          Description
        </Label>
        <Textarea id={`n-${sessionId ?? 'new'}`} value={form.description} onChange={set('description')}
          rows={3} placeholder="What this session covers" disabled={isBusy}
          className="mt-1.5 resize-none bg-white text-sm" />
      </div>

      {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={isBusy}
          className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700">
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {sessionId ? 'Save' : 'Add session'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isBusy} className="h-9">
          Cancel
        </Button>
      </div>
    </div>
  )
}
