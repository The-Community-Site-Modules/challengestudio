'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check, Lock, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { reviewSubmissionAction } from '../actions'

export interface SubmissionRow {
  id: string
  stepTitle: string
  submittedAt: string
  authorName: string
  authorAvatar: string | null
  isPrivate: boolean
  /** Null when the viewer may not open private work. */
  answer: string | null
  feedback: string
  reviewedAt: string | null
  reviewerName: string | null
}

interface Props {
  workspaceSlug: string
  challengeSlug: string
  submissions: SubmissionRow[]
  canReview: boolean
}

function initials(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export function ReviewClient({ workspaceSlug, challengeSlug, submissions, canReview }: Props) {
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('unreviewed')

  const unreviewed = submissions.filter(s => !s.reviewedAt)
  const shown = filter === 'unreviewed' ? unreviewed : submissions

  if (submissions.length === 0) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          <MessageSquare className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
          Nothing submitted yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
          Work appears here as participants complete steps that ask for it.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['unreviewed', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
              filter === f
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {f === 'unreviewed' ? `Awaiting review (${unreviewed.length})` : `All (${submissions.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
          Everything has been reviewed.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((s) => (
            <Row
              key={s.id}
              submission={s}
              workspaceSlug={workspaceSlug}
              challengeSlug={challengeSlug}
              canReview={canReview}
            />
          ))}
        </div>
      )}
    </>
  )
}

function Row({ submission, workspaceSlug, challengeSlug, canReview }: {
  submission: SubmissionRow
  workspaceSlug: string
  challengeSlug: string
  canReview: boolean
}) {
  const [feedback, setFeedback] = useState(submission.feedback)
  const [open, setOpen] = useState(!submission.reviewedAt)
  const [isBusy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function submit() {
    setError(null)
    setSent(false)
    start(async () => {
      const r = await reviewSubmissionAction(workspaceSlug, challengeSlug, submission.id, feedback)
      if (r.success) { setSent(true); setOpen(false) }
      else setError(r.error ?? 'Could not save that.')
    })
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 p-5">
        <Avatar className="h-9 w-9 shrink-0">
          {submission.authorAvatar && <AvatarImage src={submission.authorAvatar} alt="" />}
          <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
            {initials(submission.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-slate-900">{submission.authorName}</span>
            <span className="text-[13px] text-slate-500">{submission.stepTitle}</span>
            <span className="text-[12px] text-slate-400">{when(submission.submittedAt)}</span>
            {submission.isPrivate && (
              <span
                title="Marked private by the participant"
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
          </div>

          {submission.answer === null ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-500">
              This was marked private. Opening it needs permission to view private
              submissions.
            </p>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {submission.answer || <span className="text-slate-400">No written answer.</span>}
            </p>
          )}

          {submission.reviewedAt && !open && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3.5 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-wide text-emerald-700">
                Your feedback
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                {submission.feedback}
              </p>
              <p className="mt-1.5 text-[12px] text-slate-500">
                {submission.reviewerName ? `${submission.reviewerName}, ` : ''}
                {when(submission.reviewedAt)}
              </p>
            </div>
          )}
        </div>

        {canReview && submission.answer !== null && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(v => !v)}
            className="h-8 shrink-0 px-2.5 text-[13px]"
          >
            {open ? 'Close' : submission.reviewedAt ? 'Edit' : 'Review'}
          </Button>
        )}
      </div>

      {open && canReview && submission.answer !== null && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="What went well, and what to try next."
            disabled={isBusy}
            className="resize-none bg-white text-sm"
          />
          {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={isBusy || !feedback.trim()}
              className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Send feedback
            </Button>
            {sent && (
              <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Sent
              </span>
            )}
            <span className="ml-auto text-[12px] text-slate-400">
              They are emailed when you send this.
            </span>
          </div>
        </div>
      )}
    </article>
  )
}
