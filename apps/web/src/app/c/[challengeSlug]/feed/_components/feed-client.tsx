'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Loader2, EyeOff, Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ALLOWED_EMOJI, EMOJI_LABEL } from '../reactions'
import {
  createPostAction, createCommentAction, toggleReactionAction, hidePostAction,
  hideCommentAction,
} from '../actions'

export interface FeedCommentView {
  id: string
  body: string
  createdAt: string
  authorName: string
  authorAvatar: string | null
  isMine: boolean
}

export interface FeedPostView {
  id: string
  body: string
  createdAt: string
  authorName: string
  authorAvatar: string | null
  isMine: boolean
  stepLabel: string | null
  reactions: { emoji: string; count: number; mine: boolean }[]
  comments: FeedCommentView[]
}

interface Props {
  challengeSlug: string
  posts: FeedPostView[]
  canModerate: boolean
}

function initialsOf(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

/** "2h ago" — precise enough for a feed, and no dependency to carry. */
function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const steps: [number, string][] = [
    [60, 'just now'], [3600, 'm'], [86400, 'h'], [604800, 'd'],
  ]
  if (seconds < 60) return steps[0]![1]
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function Person({ name, avatar, size = 9 }: { name: string; avatar: string | null; size?: number }) {
  return (
    <Avatar className={size === 8 ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'}>
      {avatar && <AvatarImage src={avatar} alt="" />}
      <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function FeedClient({ challengeSlug, posts, canModerate }: Props) {
  const [body, setBody] = useState('')
  const [isPosting, startPost] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submitPost() {
    if (!body.trim()) return
    setError(null)
    startPost(async () => {
      const result = await createPostAction(challengeSlug, body)
      if (result.success) setBody('')
      else setError(result.error ?? 'Could not post that.')
    })
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">

      {/* Composer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share how it's going, ask a question, or cheer someone on…"
          rows={3}
          maxLength={2000}
          disabled={isPosting}
          className="resize-none border-0 p-0 text-sm shadow-none focus-visible:ring-0"
        />
        {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[12px] tabular-nums text-slate-500">
            {body.length}/2000
          </span>
          <Button
            type="button"
            size="sm"
            onClick={submitPost}
            disabled={isPosting || !body.trim()}
            className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
            <MessageCircle className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
            Nothing here yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
            Be the first to post. Sharing what you are working on is usually what
            gets a feed going.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              challengeSlug={challengeSlug}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}
    </main>
  )
}

// ─── One post ────────────────────────────────────────────────────────────────

function Post({ post, challengeSlug, canModerate }: {
  post: FeedPostView
  challengeSlug: string
  canModerate: boolean
}) {
  const [isBusy, start] = useTransition()
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const byEmoji = new Map(post.reactions.map(r => [r.emoji, r]))

  function react(emoji: string) {
    setError(null)
    start(async () => {
      const r = await toggleReactionAction(challengeSlug, post.id, emoji)
      if (!r.success && r.error) setError(r.error)
    })
  }

  function addComment() {
    if (!comment.trim()) return
    setError(null)
    start(async () => {
      const r = await createCommentAction(challengeSlug, post.id, comment)
      if (r.success) { setComment(''); setShowComment(false) }
      else setError(r.error ?? 'Could not add that comment.')
    })
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3 p-4">
        <Person name={post.authorName} avatar={post.authorAvatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-slate-900">{post.authorName}</span>
            {post.stepLabel && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                {post.stepLabel}
              </span>
            )}
            <span className="text-[12px] text-slate-500">{ago(post.createdAt)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {post.body}
          </p>
        </div>

        {(post.isMine || canModerate) && (
          <button
            type="button"
            title={post.isMine ? 'Remove your post' : 'Remove this post'}
            disabled={isBusy}
            onClick={() => start(async () => {
              const r = await hidePostAction(challengeSlug, post.id)
              if (!r.success && r.error) setError(r.error)
            })}
            className="shrink-0 rounded-md p-1.5 text-slate-300 outline-none transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
            <span className="sr-only">Remove post</span>
          </button>
        )}
      </div>

      {/* Reactions and comment toggle */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2.5">
        {ALLOWED_EMOJI.map((emoji) => {
          const r = byEmoji.get(emoji)
          return (
            <button
              key={emoji}
              type="button"
              disabled={isBusy}
              onClick={() => react(emoji)}
              aria-pressed={r?.mine ?? false}
              aria-label={`${EMOJI_LABEL[emoji]}${r?.count ? ` (${r.count})` : ''}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] transition-colors',
                r?.mine
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50'
              )}
            >
              <span aria-hidden="true">{emoji}</span>
              {r?.count ? <span className="tabular-nums">{r.count}</span> : null}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setShowComment(v => !v)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] text-slate-500 transition-colors hover:text-slate-900"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comments.length || 'Comment'}
        </button>
      </div>

      {error && (
        <p role="alert" className="px-4 pb-2 text-[13px] text-red-600">{error}</p>
      )}

      {(post.comments.length > 0 || showComment) && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Person name={c.authorName} avatar={c.authorAvatar} size={8} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-900">{c.authorName}</span>
                  <span className="text-[11px] text-slate-500">{ago(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                  {c.body}
                </p>
              </div>
              {(c.isMine || canModerate) && (
                <button
                  type="button"
                  title="Remove this comment"
                  disabled={isBusy}
                  onClick={() => start(async () => {
                    const r = await hideCommentAction(challengeSlug, c.id)
                    if (!r.success && r.error) setError(r.error)
                  })}
                  className="shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:text-slate-600"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove comment</span>
                </button>
              )}
            </div>
          ))}

          {showComment && (
            <div className="flex items-end gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                maxLength={2000}
                disabled={isBusy}
                className="resize-none bg-white text-[13px]"
              />
              <Button
                type="button"
                size="sm"
                onClick={addComment}
                disabled={isBusy || !comment.trim()}
                className="h-9 shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reply'}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
