'use client'

import { useState, useTransition } from 'react'
import { EyeOff, Undo2, Loader2, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { moderatePostAction, moderateCommentAction } from '../actions'

export interface ModComment {
  id: string
  body: string
  createdAt: string
  authorName: string
  authorAvatar: string | null
  isHidden: boolean
}

export interface ModPost {
  id: string
  body: string
  createdAt: string
  authorName: string
  authorAvatar: string | null
  isHidden: boolean
  reactionCount: number
  comments: ModComment[]
}

interface Props {
  workspaceSlug: string
  challengeSlug: string
  posts: ModPost[]
}

function initials(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

export function ModerationClient({ workspaceSlug, challengeSlug, posts }: Props) {
  // Hidden items are shown here, unlike the participant feed — this is the one
  // place they have to be visible for anyone to put them back.
  const [showHidden, setShowHidden] = useState(true)
  const visible = showHidden ? posts : posts.filter(p => !p.isHidden)
  const hiddenCount = posts.filter(p => p.isHidden).length

  if (posts.length === 0) {
    return (
      <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          <MessageCircle className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
          Nothing posted yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
          Posts from participants appear here, where you can remove anything that
          does not belong — and put it back if you change your mind.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[13px] text-slate-500">
          {posts.length} post{posts.length === 1 ? '' : 's'}
          {hiddenCount > 0 && ` · ${hiddenCount} removed`}
        </p>
        {hiddenCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Show removed
          </label>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {visible.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
          />
        ))}
      </div>
    </>
  )
}

function PostRow({ post, workspaceSlug, challengeSlug }: {
  post: ModPost
  workspaceSlug: string
  challengeSlug: string
}) {
  const [isBusy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = (hide: boolean) => start(async () => {
    const r = await moderatePostAction(workspaceSlug, challengeSlug, post.id, hide)
    if (!r.success && r.error) setError(r.error)
  })

  return (
    <article
      className={cn(
        'rounded-xl border bg-white',
        post.isHidden ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <Avatar className="h-9 w-9 shrink-0">
          {post.authorAvatar && <AvatarImage src={post.authorAvatar} alt="" />}
          <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
            {initials(post.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-sm font-medium text-slate-900">{post.authorName}</span>
            <span className="text-[12px] text-slate-500">{when(post.createdAt)}</span>
            {post.isHidden && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                Removed
              </span>
            )}
          </div>
          <p className={cn(
            'mt-1.5 whitespace-pre-wrap text-sm leading-relaxed',
            post.isHidden ? 'text-slate-500' : 'text-slate-700'
          )}>
            {post.body}
          </p>
          <p className="mt-2 text-[12px] text-slate-500">
            {post.reactionCount} reaction{post.reactionCount === 1 ? '' : 's'} ·{' '}
            {post.comments.length} comment{post.comments.length === 1 ? '' : 's'}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isBusy}
          onClick={() => toggle(!post.isHidden)}
          className="h-8 shrink-0 gap-1.5 px-2.5 text-[13px]"
        >
          {isBusy
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : post.isHidden ? <Undo2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {post.isHidden ? 'Restore' : 'Remove'}
        </Button>
      </div>

      {error && <p role="alert" className="px-4 pb-2 text-[13px] text-red-600">{error}</p>}

      {post.comments.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {post.comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              workspaceSlug={workspaceSlug}
              challengeSlug={challengeSlug}
            />
          ))}
        </div>
      )}
    </article>
  )
}

function CommentRow({ comment, workspaceSlug, challengeSlug }: {
  comment: ModComment
  workspaceSlug: string
  challengeSlug: string
}) {
  const [isBusy, start] = useTransition()

  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        {comment.authorAvatar && <AvatarImage src={comment.authorAvatar} alt="" />}
        <AvatarFallback className="bg-indigo-50 text-[10px] font-semibold text-indigo-700">
          {initials(comment.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-slate-900">{comment.authorName}</span>
          <span className="text-[11px] text-slate-500">{when(comment.createdAt)}</span>
          {comment.isHidden && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              Removed
            </span>
          )}
        </div>
        <p className={cn(
          'mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed',
          comment.isHidden ? 'text-slate-500' : 'text-slate-600'
        )}>
          {comment.body}
        </p>
      </div>
      <button
        type="button"
        disabled={isBusy}
        title={comment.isHidden ? 'Restore this comment' : 'Remove this comment'}
        onClick={() => start(async () => {
          await moderateCommentAction(workspaceSlug, challengeSlug, comment.id, !comment.isHidden)
        })}
        className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:text-slate-700"
      >
        {isBusy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : comment.isHidden ? <Undo2 className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        <span className="sr-only">{comment.isHidden ? 'Restore' : 'Remove'}</span>
      </button>
    </div>
  )
}
