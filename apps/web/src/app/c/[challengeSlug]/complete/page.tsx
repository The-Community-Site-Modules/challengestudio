// Route: /c/[challengeSlug]/complete — the page you reach on finishing.
//
// This was a mock: a hardcoded "You did it, Jane!", a 5-Day Business Launch
// Challenge nobody ran, 1,450 XP, "Ranked #12 of 247", a certificate naming
// Jane Smith, seven badges, and a 48-hour offer pointing at example.com. A
// real participant finishing a real challenge was shown all of it.
//
// Everything here now comes from the participant's own record. What the app
// does not track — certificates, badges, rankings, offers — is not shown at
// all rather than invented; those belong to later milestones.

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, CheckCircle, Flame, ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { getParticipantProgress } from '../actions'

interface Props { params: Promise<{ challengeSlug: string }> }

export const metadata = { title: 'Challenge complete — Challenge Studio' }

export default async function CompletePage({ params }: Props) {
  const { challengeSlug } = await params

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/complete`)
  }

  const progress = await getParticipantProgress(challengeSlug, user.id)
  if (!progress) notFound()

  const { challenge, participant, steps, streak, xp, completedCount, totalRequired } = progress

  // Reaching here without having finished would congratulate someone mid-way.
  if (completedCount < totalRequired || totalRequired === 0) {
    redirect(`/c/${challengeSlug}/hub`)
  }

  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0]
  const finishedOn = (participant.completedAt ?? new Date()).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const facts = [
    { Icon: Star,        label: `${xp.toLocaleString()} XP earned` },
    { Icon: CheckCircle, label: `${completedCount} of ${steps.length} steps completed` },
    ...(streak > 1 ? [{ Icon: Flame, label: `${streak}-day streak` }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50/70">

      <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">
          🏆
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
          Challenge complete
        </p>
        <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-white sm:text-[38px]">
          Well done, {firstName}
        </h1>
        <p className="mt-2 text-[15px] text-white/85">
          You finished <strong className="font-semibold text-white">{challenge.title}</strong> on {finishedOn}.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/85">
          {facts.map(({ Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="h-4 w-4 text-white/70" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6">

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
              What you did
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Hosted by {challenge.workspace.name}.
            </p>
          </header>

          <ul className="divide-y divide-slate-100">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-3 px-6 py-3.5">
                <CheckCircle
                  className={step.isCompleted ? 'h-4 w-4 shrink-0 text-emerald-500' : 'h-4 w-4 shrink-0 text-slate-300'}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {step.title}
                </span>
                {step.isCompleted && step.pointsXp != null && (
                  <span className="shrink-0 text-[13px] tabular-nums text-slate-500">
                    {step.pointsXp} XP
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* One action, not two. A "My challenges" button belongs at
            /account/challenges, which is still a stub; pointing it at
            /dashboard sent participants to the creator-side workspace picker,
            which for someone who owns no workspace is an empty page. */}
        <div className="mt-6">
          <Link
            href={`/c/${challengeSlug}/hub`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to the challenge
          </Link>
        </div>
      </main>
    </div>
  )
}
