// Route: /account/challenges — every challenge this person has joined.
//
// Was one line: "My Challenges — Milestone 9". A participant in two challenges
// had no page that listed them, so getting back to one meant finding the
// original email or remembering the URL.
//
// Each card goes to the next thing to do — the first open day not yet done —
// rather than to the hub, because "carry on" is why anyone opens this page.

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, Flame, Lock } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { getParticipantProgress } from '@/lib/enrollment/progress'
import { isParticipating } from '@/lib/enrollment/register'
import { cn } from '@/lib/utils'

export const metadata = { title: 'My challenges — Challenge Studio' }
export const dynamic = 'force-dynamic'

type Progress = NonNullable<Awaited<ReturnType<typeof getParticipantProgress>>>

const STATUS_NOTE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'Waiting for approval', className: 'bg-amber-50 text-amber-700 ring-amber-100' },
  REJECTED:  { label: 'Not approved',         className: 'bg-rose-50 text-rose-700 ring-rose-100' },
  WITHDRAWN: { label: 'Left',                 className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export default async function MyChallengesPage() {
  const user = await requireUser()

  const enrolments = await db.participant.findMany({
    where:   { profileId: user.id },
    orderBy: { registeredAt: 'desc' },
    select:  { status: true, challenge: { select: { slug: true } } },
  })

  // One progress read per challenge. A person is in a handful of challenges,
  // not hundreds, and this is the same function the hub uses — so the numbers
  // here cannot disagree with the ones they see after clicking through.
  const loaded = await Promise.all(
    enrolments.map(async (e) => ({
      status: String(e.status),
      slug: e.challenge.slug,
      progress: await getParticipantProgress(e.challenge.slug, user.id),
    }))
  )

  // A challenge deleted after someone joined it has no progress to show.
  const rows: { status: string; slug: string; progress: Progress }[] = []
  for (const r of loaded) {
    if (r.progress) rows.push({ status: r.status, slug: r.slug, progress: r.progress })
  }

  const active = rows.filter((r) => isParticipating(r.status) && r.progress.progressPct < 100)
  const finished = rows.filter((r) => isParticipating(r.status) && r.progress.progressPct >= 100)
  const other = rows.filter((r) => !isParticipating(r.status))

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70">
      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-10 sm:px-8 lg:pt-12">

        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Participation
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
            My challenges
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Everything you have joined, and where you are in each.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="mt-9 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
              You have not joined a challenge yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
              When you register for one, it shows up here so you can always find your way back.
            </p>
          </div>
        ) : (
          <div className="mt-9 space-y-9">
            {active.length > 0 && (
              <Group title="In progress">
                {active.map((r) => <ChallengeRow key={r.slug} slug={r.slug} status={r.status} p={r.progress} />)}
              </Group>
            )}
            {finished.length > 0 && (
              <Group title="Completed">
                {finished.map((r) => <ChallengeRow key={r.slug} slug={r.slug} status={r.status} p={r.progress} />)}
              </Group>
            )}
            {other.length > 0 && (
              <Group title="Not active">
                {other.map((r) => <ChallengeRow key={r.slug} slug={r.slug} status={r.status} p={r.progress} />)}
              </Group>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h2>
      <ul className="mt-3 space-y-3">{children}</ul>
    </section>
  )
}

function ChallengeRow({ slug, status, p }: { slug: string; status: string; p: Progress }) {
  const base = `/c/${slug}`
  const participating = isParticipating(status)
  const done = p.progressPct >= 100
  const total = p.steps.length

  // The next thing to do: the first open day that is not finished. The day
  // URL is `order + 1`, the same key the hub links with.
  const next = p.steps.find((s) => s.status === 'active')
  const nextLocked = !next ? p.steps.find((s) => s.status === 'locked') : undefined

  const href = !participating ? base
    : done ? `${base}/complete`
    : next ? `${base}/day/${next.order + 1}`
    : `${base}/hub`

  const note = STATUS_NOTE[status]

  return (
    <li>
      <Link
        href={href}
        className="group block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-indigo-200 sm:p-6"
      >
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{p.challenge.workspace.name}</p>
            <h3 className="mt-0.5 truncate text-[16px] font-semibold tracking-tight text-slate-900">
              {p.challenge.title}
            </h3>
          </div>

          {note ? (
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1', note.className)}>
              {note.label}
            </span>
          ) : done ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </span>
          ) : null}
        </div>

        {participating && (
          <>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={p.progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${p.challenge.title} progress`}
              >
                <div
                  className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-indigo-600')}
                  style={{ width: `${Math.min(100, p.progressPct)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600">
                {p.progressPct}%
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <span className="tabular-nums">
                {p.completedCount} of {total} {total === 1 ? 'day' : 'days'} done
              </span>
              {p.streak > 0 && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> {p.streak}-day streak
                </span>
              )}
              {p.xp > 0 && <span className="tabular-nums">{p.xp} points</span>}

              <span className="ml-auto flex items-center gap-1 font-medium text-indigo-600 group-hover:underline">
                {done ? 'See your completion'
                  : next ? <>Continue: Day {next.position}</>
                  : nextLocked ? <><Lock className="h-3 w-3" /> Next day opens soon</>
                  : 'Open'}
                {!nextLocked && <ArrowRight className="h-3.5 w-3.5" />}
              </span>
            </div>
          </>
        )}

        {!participating && status === 'PENDING' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> The organiser has to approve you before day one opens.
          </p>
        )}
      </Link>
    </li>
  )
}
