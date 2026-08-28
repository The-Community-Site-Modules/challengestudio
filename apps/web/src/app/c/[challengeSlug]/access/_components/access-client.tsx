'use client'

import { useState, useTransition } from 'react'
import { Mail, Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { signInAction, signInWithMagicLinkAction } from '@/app/(auth)/auth/actions'

interface Props {
  challengeSlug: string
  challengeTitle: string
  hostName: string
  /** Where to send them once they are in. */
  next: string
  error?: string
  /** Email a link was just sent to, echoed back by the action. */
  sentTo?: string
}

/**
 * Participant sign-in.
 *
 * A magic link is the primary route, not an afterthought: most participants
 * arrived through registration, which signs them up by emailed link, so a
 * good number of them have no password to type. The password form is second
 * for the ones who set one.
 */
export function AccessClient({
  challengeSlug, challengeTitle, hostName, next, error, sentTo,
}: Props) {
  const [isSendingLink, startLink] = useTransition()
  const [isSigningIn, startSignIn] = useTransition()
  const [showPassword, setShowPassword] = useState(false)

  const selfPath = `/c/${challengeSlug}/access?next=${encodeURIComponent(next)}`
  const busy = isSendingLink || isSigningIn

  /** Both actions need the same return-path fields; this fills them in. */
  function withPaths(form: HTMLFormElement) {
    const fd = new FormData(form)
    fd.set('next', next)
    fd.set('errorPath', selfPath)
    return fd
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
          Check your inbox
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
          We sent a sign-in link to <strong className="text-slate-700">{sentTo}</strong>.
          Opening it brings you straight back to {challengeTitle}.
        </p>
        <p className="mt-4 text-[13px] text-slate-500">
          Nothing after a minute? Check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
        Sign in to continue
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        {hostName} runs {challengeTitle}. Sign in with the email you registered with.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          {error}
        </p>
      )}

      {/* Magic link — the route most participants have. */}
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = withPaths(e.currentTarget)
          fd.set('sentPath', selfPath)
          startLink(async () => { await signInWithMagicLinkAction(fd) })
        }}
      >
        <div>
          <Label htmlFor="access-email" className="text-[13px] font-medium text-slate-700">
            Email address
          </Label>
          <Input
            id="access-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busy}
            className="mt-2 h-10 text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="h-10 w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isSendingLink
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
            : <><Mail className="h-4 w-4" /> Email me a sign-in link</>}
        </Button>
      </form>

      {!showPassword ? (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="mx-auto mt-5 block text-[13px] font-medium text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:underline"
        >
          Use a password instead
        </button>
      ) : (
        <>
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[11px] uppercase tracking-wide text-slate-500">
              or
            </span>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              startSignIn(async () => { await signInAction(withPaths(e.currentTarget)) })
            }}
          >
            <div>
              <Label htmlFor="access-pw-email" className="text-[13px] font-medium text-slate-700">
                Email address
              </Label>
              <Input
                id="access-pw-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={busy}
                className="mt-2 h-10 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="access-password" className="text-[13px] font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="access-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={busy}
                className="mt-2 h-10 text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={busy}
              className="h-10 w-full gap-2"
            >
              {isSigningIn
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                : <><KeyRound className="h-4 w-4" /> Sign in</>}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
