// Route: /c/[challengeSlug]/access — sign-in for someone already enrolled.
//
// Four routes redirect here when a participant arrives without a session — the
// hub, the day pages, the welcome page and completeStepAction. It was a
// five-line placeholder, so every one of those was a dead end: a participant
// returning to a challenge they had registered for landed on the words
// "Participant Access / Login — Milestone 7" and could go no further.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { AccessClient } from './_components/access-client'

interface Props {
  params:       Promise<{ challengeSlug: string }>
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>
}

export const metadata = { title: 'Sign in — Challenge Studio' }

/** Only ever bounce to a path inside this app, and inside this challenge. */
function safeNext(value: string | undefined, challengeSlug: string): string {
  const fallback = `/c/${challengeSlug}/hub`
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export default async function AccessPage({ params, searchParams }: Props) {
  const { challengeSlug } = await params
  const { next: rawNext, error, sent } = await searchParams

  const next = safeNext(rawNext, challengeSlug)

  const challenge = await db.challenge.findFirst({
    where:  { slug: challengeSlug },
    select: {
      id: true, title: true, promise: true,
      workspace: { select: { name: true } },
    },
  })
  if (!challenge) notFound()

  // Already signed in — there is nothing to ask for. Send them on rather than
  // showing a sign-in form to someone who is signed in.
  const user = await getCurrentUser()
  if (user) redirect(next)

  return (
    <div className="min-h-screen bg-slate-50/70">
      <main className="mx-auto w-full max-w-md px-5 py-14 sm:py-20">

        <header className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {challenge.workspace.name}
          </p>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
            {challenge.title}
          </h1>
          {challenge.promise && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {challenge.promise}
            </p>
          )}
        </header>

        <AccessClient
          challengeSlug={challengeSlug}
          challengeTitle={challenge.title}
          hostName={challenge.workspace.name}
          next={next}
          {...(error ? { error: decodeURIComponent(error) } : {})}
          {...(sent  ? { sentTo: decodeURIComponent(sent) } : {})}
        />

        <p className="mt-6 text-center text-[13px] text-slate-500">
          Not registered yet?{' '}
          <Link
            href={`/c/${challengeSlug}`}
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Join {challenge.title}
          </Link>
        </p>
      </main>
    </div>
  )
}
