/**
 * Everything the challenge has handed out: downloads from unlocked days, and
 * replays of sessions that have happened.
 *
 * Only unlocked days are read. A resources page that lists tomorrow's worksheet
 * gives away the day before it opens, which is the one thing the unlock rules
 * exist to prevent.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Video, MessageCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { getParticipantProgress } from '@/lib/enrollment/progress'
import { db } from '@/lib/db'
import { safeHref } from '@/lib/safe-url'
import { isParticipating } from '@/lib/enrollment/register'

interface Props {
  params: Promise<{ challengeSlug: string }>
}

function payloadString(data: unknown, keys: string[], fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback
  const d = data as Record<string, unknown>
  for (const key of keys) {
    const v = d[key]
    if (typeof v === 'string' && v.trim()) return v
  }
  return fallback
}

export default async function ResourcesPage({ params }: Props) {
  const { challengeSlug } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/resources`)

  const progress = await getParticipantProgress(challengeSlug, user.id)
  if (!progress) redirect(`/c/${challengeSlug}`)
  if (!isParticipating(progress.participant.status)) redirect(`/c/${challengeSlug}/welcome`)

  const { steps } = progress
  const base = `/c/${challengeSlug}`

  const unlockedStepIds = steps.filter((s) => s.unlocked).map((s) => s.id)
  const dayNumberByStep = new Map(steps.map((s) => [s.id, s.position]))

  const [blocks, sessions] = await Promise.all([
    unlockedStepIds.length > 0
      ? db.contentBlock.findMany({
          where: { stepId: { in: unlockedStepIds }, type: { in: ['DOWNLOAD', 'IMAGE'] } },
          orderBy: { order: 'asc' },
          select: { id: true, type: true, data: true, stepId: true },
        })
      : Promise.resolve([]),
    db.liveSession.findMany({
      where: { challenge: { slug: challengeSlug }, replayUrl: { not: null } },
      orderBy: { startsAt: 'desc' },
      select: { id: true, title: true, replayUrl: true, durationMinutes: true },
    }),
  ])

  const empty = blocks.length === 0 && sessions.length === 0

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Resources</h1>
        <p className="mt-1 text-muted-foreground">
          Downloads and replays from the days you have reached.
        </p>

        {empty ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing here yet. Worksheets and session replays appear as the challenge goes on.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {blocks.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Downloads
                </h2>
                <ul className="mt-3 space-y-2">
                  {blocks.map((b) => {
                    const url = safeHref(payloadString(b.data, ['url', 'href'], ''))
                    const name = payloadString(b.data, ['name', 'title', 'caption'], 'Download')
                    const day = dayNumberByStep.get(b.stepId)
                    const row = (
                      <>
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{name}</span>
                        {day && (
                          <span className="shrink-0 text-xs text-muted-foreground">Day {day}</span>
                        )}
                      </>
                    )
                    return (
                      <li key={b.id}>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                          >
                            {row}
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                            {row}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {sessions.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Replays
                </h2>
                <ul className="mt-3 space-y-2">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <a
                        href={s.replayUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
                      >
                        <Video className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {s.durationMinutes} min
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <Link
          href={`${base}/feed`}
          className="mt-6 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Need help? Ask in the community
        </Link>
      </main>
    </div>
  )
}
