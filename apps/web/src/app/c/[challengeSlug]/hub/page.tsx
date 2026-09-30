/**
 * The participant hub: what to do today, where they are, and who else is here.
 *
 * ── One honest limitation, stated because the design implies otherwise ──────
 *
 * The today card lists the blocks that make up today, and the design shows
 * individual ticks beside them. Completion is recorded per *step*, not per
 * block — `submissions` has a `stepId` and nothing finer — so a per-block tick
 * would be a guess. Every block therefore shows done when the step is done and
 * open when it is not. Ticking them individually needs a `step_progress` event
 * table, which the build plan already asks for and which does not exist yet.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight, Flame, Lock, Check, Trophy, CalendarDays, FileText,
  Video, MessageSquare, Download, Play, Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth/session'
import { getParticipantProgress } from '../actions'
import { db } from '@/lib/db'
import { BADGES } from '@/lib/gamification'
import { HubComposer } from './_components/hub-composer'

interface Props {
  params: Promise<{ challengeSlug: string }>
}

const BLOCK_ICON: Record<string, typeof FileText> = {
  VIDEO: Play,
  DOWNLOAD: Download,
  ASSIGNMENT: FileText,
  TEXT_RESPONSE: FileText,
  REFLECTION: MessageSquare,
  DISCUSSION_PROMPT: MessageSquare,
  LIVE_SESSION: Radio,
  CHECKLIST: Check,
  HEADING: FileText,
}

function blockTitle(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback
  const d = data as Record<string, unknown>
  for (const key of ['title', 'heading', 'caption', 'prompt', 'name']) {
    const v = d[key]
    if (typeof v === 'string' && v.trim()) return v
  }
  return fallback
}

function isPrivateBlock(type: string): boolean {
  return type === 'REFLECTION'
}

export default async function ChallengeHubPage({ params }: Props) {
  const { challengeSlug } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/hub`)

  const progress = await getParticipantProgress(challengeSlug, user.id)
  if (!progress) redirect(`/c/${challengeSlug}`)
  if (progress.participant.status === 'PENDING') redirect(`/c/${challengeSlug}/welcome`)

  const { challenge, participant, steps, streak, xp, progressPct, completedCount, totalRequired } = progress
  const base = `/c/${challengeSlug}`

  const todayStep = steps.find((s) => s.status === 'active') ?? steps.find((s) => s.unlocked && !s.isCompleted)

  const now = new Date()
  const timeZone = challenge.timezone ?? 'UTC'

  const [todayBlocks, awards, sessions, posts, postCount] = await Promise.all([
    todayStep
      ? db.contentBlock.findMany({
          where: { stepId: todayStep.id },
          orderBy: { order: 'asc' },
          select: { id: true, type: true, data: true },
        })
      : Promise.resolve([]),
    db.badgeAward.findMany({
      where: { participantId: participant.id },
      select: { badgeKey: true },
    }),
    db.liveSession.findMany({
      where: { challenge: { slug: challengeSlug } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true, title: true, startsAt: true, durationMinutes: true,
        hostName: true, joinUrl: true, replayUrl: true,
      },
    }),
    db.feedPost.findMany({
      where: { challenge: { slug: challengeSlug }, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: {
        id: true, body: true, createdAt: true,
        // A post belongs to a participant, not directly to a profile — the
        // name has to come through the enrolment.
        participant: { select: { profile: { select: { fullName: true, email: true } } } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    db.feedPost.count({ where: { challenge: { slug: challengeSlug }, isHidden: false } }),
  ])

  const earned = new Set(awards.map((a) => a.badgeKey))
  const nextSession = sessions.find((s) => s.startsAt >= now)
  const replays = sessions.filter((s) => s.startsAt < now && s.replayUrl)

  // The badge one more finished step would unlock. Evaluated against the real
  // rules rather than hard-coded, so it stays right when the rules change.
  const nextBadge = BADGES.find(
    (b) =>
      !earned.has(b.key) &&
      b.earned({
        completedSteps: completedCount + 1,
        totalSteps: totalRequired,
        streak: streak + 1,
        posts: 0,
        comments: 0,
      })
  )

  const downloads = todayBlocks.filter((b) => (b.type as string) === 'DOWNLOAD')

  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(d)
  const fmtDay = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', timeZone }).format(d)

  const stats = [
    { value: `${completedCount} / ${steps.length}`, label: 'days done', tone: 'plain' as const },
    { value: String(streak), label: 'day streak', tone: 'streak' as const },
    { value: String(xp), label: 'points', tone: 'plain' as const },
  ]

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-0">
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Phones get the numbers first; the desktop design keeps them in the
            right rail, where there is room for the bar and the badge nudge. */}
        <StatRow stats={stats} className="mb-5 md:hidden" />

        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Main column ──────────────────────────────────────────── */}
          <div className="space-y-5 lg:col-span-2">
            {todayStep ? (
              <section className="overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground">
                <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,280px)]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-foreground/75">
                      Today · Day {todayStep.order + 1} of {steps.length}
                    </p>
                    <h1 className="mt-2 text-[30px] font-bold leading-tight tracking-tight">
                      {todayStep.title}
                    </h1>
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <Button asChild variant="secondary" className="h-11 gap-2 px-5 font-semibold">
                        <Link href={`${base}/day/${todayStep.order + 1}`}>
                          Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      {todayStep.estimatedMinutes && (
                        <span className="text-sm text-primary-foreground/80">
                          About {todayStep.estimatedMinutes} min left
                        </span>
                      )}
                    </div>
                  </div>

                  {todayBlocks.length > 0 && (
                    <ul className="space-y-2 rounded-xl bg-background/95 p-3">
                      {todayBlocks.map((b) => {
                        const type = b.type as string
                        const Icon = BLOCK_ICON[type] ?? FileText
                        const done = todayStep.isCompleted
                        return (
                          <li
                            key={b.id}
                            className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2"
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                                done ? 'bg-green-500 text-white' : 'border-2 border-border'
                              )}
                            >
                              {done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                            </span>
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                              {blockTitle(b.data, type.toLowerCase().replace('_', ' '))}
                            </span>
                            {isPrivateBlock(type) && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">Private</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-border bg-background p-8 text-center">
                <p className="text-lg font-semibold text-foreground">Nothing open right now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The next day unlocks on schedule — we will email you.
                </p>
              </section>
            )}

            {/* ── Journey ───────────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-bold tracking-tight text-foreground">Your journey</h2>
                <Link href={`${base}/journey`} className="text-sm font-medium text-primary hover:underline">
                  See all days
                </Link>
              </div>

              <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {steps.map((s) => {
                  const isToday = s.id === todayStep?.id
                  return (
                    <li key={s.id}>
                      <Link
                        href={s.unlocked ? `${base}/day/${s.order + 1}` : '#'}
                        aria-disabled={!s.unlocked}
                        tabIndex={s.unlocked ? undefined : -1}
                        className={cn(
                          'flex h-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors',
                          isToday
                            ? 'border-primary bg-primary/[0.06]'
                            : s.isCompleted
                              ? 'border-border bg-background hover:bg-muted/50'
                              : 'pointer-events-none border-border bg-muted/30'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold',
                            s.isCompleted
                              ? 'bg-green-500 text-white'
                              : isToday
                                ? 'border-2 border-primary text-primary'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {s.isCompleted ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : s.unlocked ? (
                            s.order + 1
                          ) : (
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </span>
                        <span className="text-[12px] font-semibold text-foreground">Day {s.order + 1}</span>
                        <span className="text-[11px] leading-tight text-muted-foreground">
                          {s.isCompleted
                            ? 'Done'
                            : isToday
                              ? 'Today'
                              : s.unlocksAt
                                ? fmtDay(s.unlocksAt)
                                : 'Locked'}
                        </span>
                      </Link>
                    </li>
                  )
                })}

                <li>
                  <div className="flex h-full flex-col items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg">🏆</span>
                    <span className="text-[12px] font-semibold text-amber-900">Finish line</span>
                    <span className="text-[11px] leading-tight text-amber-800">Badge + next step</span>
                  </div>
                </li>
              </ul>

              {nextBadge && (
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[13px] text-amber-900 md:hidden">
                  <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Finish today to earn <span className="font-semibold">{nextBadge.name}</span>
                </p>
              )}
            </section>

            {/* ── Feed preview ──────────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-bold tracking-tight text-foreground">From the group</h2>
                <Link href={`${base}/feed`} className="text-sm font-medium text-primary hover:underline">
                  Open community
                </Link>
              </div>

              <HubComposer challengeSlug={challengeSlug} />

              {posts.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {posts.map((p) => {
                    const profile = p.participant.profile
                    const name = profile?.fullName ?? profile?.email?.split('@')[0] ?? 'A participant'
                    const initials = name.slice(0, 2).toUpperCase()
                    return (
                      <li key={p.id} className="rounded-xl border border-border p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials}
                          </span>
                          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">{name}</p>
                        </div>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                          {p.body}
                        </p>
                        <p className="mt-2.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                          <span>♥ {p._count.reactions}</span>
                          <span>{p._count.comments} replies</span>
                        </p>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Nobody has posted yet. Be the first — it usually starts the thread.
                </p>
              )}
            </section>
          </div>

          {/* ── Right rail ───────────────────────────────────────────── */}
          <div className="space-y-5">
            <section className="hidden rounded-2xl border border-border bg-background p-5 md:block">
              <h2 className="text-[17px] font-bold tracking-tight text-foreground">Your progress</h2>
              <StatRow stats={stats} className="mt-4" />

              <div className="mt-4 flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Challenge progress</span>
                <span className="font-semibold text-foreground tabular-nums">{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
              </div>

              {nextBadge && (
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[13px] leading-snug text-amber-900">
                  <Trophy className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Finish today to earn <span className="font-semibold">{nextBadge.name}</span>
                    {todayStep?.pointsXp ? ` · +${todayStep.pointsXp} XP` : ''}
                  </span>
                </p>
              )}
            </section>

            {nextSession && (
              <section className="rounded-2xl bg-slate-900 p-5 text-slate-50">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Live next
                </p>
                <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-tight">
                  {nextSession.title}
                </h2>
                <p className="mt-1.5 text-[13px] text-slate-300">
                  {fmtTime(nextSession.startsAt)} · {nextSession.durationMinutes} min
                  {nextSession.hostName ? ` · with ${nextSession.hostName}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="secondary" size="sm" className="gap-2">
                    <a href={`${base}/sessions/${nextSession.id}/calendar`}>
                      <CalendarDays className="h-4 w-4" aria-hidden="true" /> Add to calendar
                    </a>
                  </Button>
                  {nextSession.joinUrl && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800 hover:text-slate-50"
                    >
                      <a href={nextSession.joinUrl} target="_blank" rel="noopener noreferrer">
                        Join the session
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-background p-5">
              <h2 className="text-[17px] font-bold tracking-tight text-foreground">Resources</h2>

              {downloads.length + replays.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {downloads.map((d) => (
                    <li key={d.id}>
                      <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                          {blockTitle(d.data, 'Download')}
                        </span>
                      </div>
                    </li>
                  ))}
                  {replays.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.replayUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40"
                      >
                        <Video className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                          {r.title} replay
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {r.durationMinutes} min
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Downloads and replays appear here as the challenge goes on.
                </p>
              )}

              <Link
                href={`${base}/resources`}
                className="mt-4 block text-sm font-medium text-primary hover:underline"
              >
                See all resources
              </Link>
            </section>

            {postCount > 0 && (
              <p className="text-center text-xs text-muted-foreground md:hidden">
                {postCount} posts in the community
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function StatRow({
  stats, className,
}: {
  stats: { value: string; label: string; tone: 'plain' | 'streak' }[]
  className?: string
}) {
  return (
    <dl className={cn('grid grid-cols-3 gap-2.5', className)}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            'rounded-xl border px-3 py-2.5 text-center',
            s.tone === 'streak' ? 'border-orange-200 bg-orange-50/70' : 'border-border bg-background'
          )}
        >
          <dd
            className={cn(
              'flex items-center justify-center gap-1 text-[19px] font-bold leading-none tracking-tight tabular-nums',
              s.tone === 'streak' ? 'text-orange-600' : 'text-foreground'
            )}
          >
            {s.tone === 'streak' && <Flame className="h-4 w-4" aria-hidden="true" />}
            {s.value}
          </dd>
          <dt className="mt-1.5 text-[11px] text-muted-foreground">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}
