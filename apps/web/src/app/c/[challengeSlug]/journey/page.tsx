/**
 * Every day of the challenge, in order, with where this participant is.
 *
 * The hub shows a compressed strip of the same thing; this is the full list,
 * which is what "See all days" and the Journey tab both point at. A tab that
 * 404s is worse than a tab that is plain.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth/session'
import { getParticipantProgress } from '../actions'

interface Props {
  params: Promise<{ challengeSlug: string }>
}

export default async function JourneyPage({ params }: Props) {
  const { challengeSlug } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/journey`)

  const progress = await getParticipantProgress(challengeSlug, user.id)
  if (!progress) redirect(`/c/${challengeSlug}`)
  if (progress.participant.status === 'PENDING') redirect(`/c/${challengeSlug}/welcome`)

  const { challenge, steps, completedCount, totalRequired, progressPct } = progress
  const base = `/c/${challengeSlug}`
  const timeZone = challenge.timezone ?? 'UTC'

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone,
    }).format(d)

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Your journey</h1>
        <p className="mt-1 text-muted-foreground">
          {completedCount} of {totalRequired} required {totalRequired === 1 ? 'day' : 'days'} done
          {' · '}
          {progressPct}% through
        </p>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((s) => {
            const open = s.unlocked
            const body = (
              <>
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    s.isCompleted
                      ? 'bg-green-500 text-white'
                      : open
                        ? 'border-2 border-primary text-primary'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s.isCompleted ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : open ? (
                    s.order + 1
                  ) : (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Day {s.order + 1}
                    {!s.isRequired && ' · optional'}
                  </span>
                  <span className="mt-0.5 block truncate font-semibold text-foreground">{s.title}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {s.isCompleted
                      ? 'Completed'
                      : open
                        ? `Open now${s.estimatedMinutes ? ` · about ${s.estimatedMinutes} min` : ''}`
                        : s.unlocksAt
                          ? `Unlocks ${fmt(s.unlocksAt)}`
                          : 'Locked'}
                  </span>
                </span>

                {open && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </>
            )

            return (
              <li key={s.id}>
                {open ? (
                  <Link
                    href={`${base}/day/${s.order + 1}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
                    {body}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </main>
    </div>
  )
}
