// Route: /c/[challengeSlug]/leaderboard
//
// This was a hardcoded top ten with invented names and scores. Standings are
// now summed from the points ledger, so every number here traces back to a
// row saying what earned it.

import { redirect, notFound } from 'next/navigation'
import { Trophy, Flame } from 'lucide-react'
import { ChallengeNav } from '@/components/participant/challenge-nav'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { leaderboard } from '@/lib/gamification'
import { cn } from '@/lib/utils'

interface Props { params: Promise<{ challengeSlug: string }> }

export const metadata = { title: 'Leaderboard — Challenge Studio' }

function initialsOf(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

/** Gold, silver, bronze — and nothing for everyone else. */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function LeaderboardPage({ params }: Props) {
  const { challengeSlug } = await params

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/leaderboard`)
  }

  const challenge = await db.challenge.findFirst({
    where:  { slug: challengeSlug },
    select: { id: true, title: true, workspace: { select: { name: true } } },
  })
  if (!challenge) notFound()

  const me = await db.participant.findUnique({
    where:  { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true },
  })
  if (!me) redirect(`/c/${challengeSlug}`)
  if (me.status === 'PENDING') redirect(`/c/${challengeSlug}/welcome`)

  const standings = await leaderboard(challenge.id, 50)

  // One query for the names, rather than one per row.
  const people = await db.participant.findMany({
    where:  { id: { in: standings.map(s => s.participantId) } },
    select: {
      id: true,
      profile: { select: { fullName: true, email: true, avatarUrl: true } },
    },
  })
  const byId = new Map(people.map(p => [p.id, p.profile]))

  const rows = standings.map((s, i) => {
    const profile = byId.get(s.participantId)
    return {
      rank: i + 1,
      participantId: s.participantId,
      points: s.points,
      name: profile?.fullName?.trim() || profile?.email || 'Someone',
      avatar: profile?.avatarUrl ?? null,
      isMe: s.participantId === me.id,
    }
  })

  const myRow = rows.find(r => r.isMe)

  return (
    <div className="min-h-screen bg-slate-50/70">
      <ChallengeNav
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
        hostName={challenge.workspace.name}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">
        <header className="mb-5">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Points come from completing steps and taking part. Everything here is
            counted from what people have actually done.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Trophy className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
              No scores yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
              The board fills in as people complete steps. Finish your first one
              and you will be on it.
            </p>
          </div>
        ) : (
          <>
            {myRow && myRow.rank > 10 && (
              <p className="mb-3 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-[13px] text-indigo-900">
                <Flame className="h-4 w-4 shrink-0 text-indigo-500" />
                You are {myRow.rank}
                {myRow.rank % 10 === 1 && myRow.rank !== 11 ? 'st'
                  : myRow.rank % 10 === 2 && myRow.rank !== 12 ? 'nd'
                  : myRow.rank % 10 === 3 && myRow.rank !== 13 ? 'rd' : 'th'}{' '}
                with {myRow.points.toLocaleString()} points.
              </p>
            )}

            <ol className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {rows.map((row) => (
                <li
                  key={row.participantId}
                  className={cn(
                    'flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0',
                    row.isMe && 'bg-indigo-50/60'
                  )}
                >
                  <span className="w-7 shrink-0 text-center text-[13px] tabular-nums text-slate-500">
                    {MEDAL[row.rank] ?? row.rank}
                  </span>

                  <Avatar className="h-8 w-8 shrink-0">
                    {row.avatar && <AvatarImage src={row.avatar} alt="" />}
                    <AvatarFallback className="bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                      {initialsOf(row.name)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    {row.name}
                    {row.isMe && (
                      <span className="ml-1.5 text-[12px] font-medium text-indigo-600">you</span>
                    )}
                  </span>

                  <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900">
                    {row.points.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </div>
  )
}
