/**
 * Recent activity for a challenge (PRD §17.1, milestone 10).
 *
 * The overview page used to show a hand-written list — "Sarah K. completed
 * Day 3", "6 new registrations today" — about challenges those people were
 * never in. This gathers the same four kinds of event from the records that
 * actually hold them, and merges them into one time-ordered list.
 *
 * Nothing here reads submission bodies or post text beyond what a facilitator
 * already sees on the feed, and a private submission is reported as an event
 * without its content.
 */

import { db } from '@/lib/db'

export type ActivityKind = 'registered' | 'submitted' | 'posted' | 'commented'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** Who did it. */
  name: string
  /** What they did, without the person's name — the UI puts them together. */
  detail: string
  at: Date
}

const displayName = (p: { fullName: string | null; email: string }) =>
  p.fullName?.trim() || p.email

/**
 * The most recent events across registrations, submissions, posts and
 * comments. Each source is capped before merging so one busy stream cannot
 * crowd the others out of the query, and the merged list is capped again.
 */
export async function recentActivity(challengeId: string, limit = 12): Promise<ActivityItem[]> {
  const per = limit

  const [registrations, submissions, posts, comments] = await Promise.all([
    db.participant.findMany({
      where:   { challengeId },
      orderBy: { registeredAt: 'desc' },
      take: per,
      select: {
        id: true, registeredAt: true,
        profile: { select: { fullName: true, email: true } },
      },
    }),
    db.submission.findMany({
      where:   { participant: { challengeId } },
      orderBy: { submittedAt: 'desc' },
      take: per,
      // No `data`: an activity line never needs the answer itself.
      select: {
        id: true, submittedAt: true, isPrivate: true,
        step: { select: { title: true } },
        participant: { select: { profile: { select: { fullName: true, email: true } } } },
      },
    }),
    db.feedPost.findMany({
      where:   { challengeId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: per,
      select: {
        id: true, createdAt: true,
        participant: { select: { profile: { select: { fullName: true, email: true } } } },
      },
    }),
    db.feedComment.findMany({
      where:   { post: { challengeId, isHidden: false } },
      orderBy: { createdAt: 'desc' },
      take: per,
      select: {
        id: true, createdAt: true,
        participant: { select: { profile: { select: { fullName: true, email: true } } } },
      },
    }),
  ])

  const items: ActivityItem[] = [
    ...registrations.map((r) => ({
      id: `reg:${r.id}`,
      kind: 'registered' as const,
      name: displayName(r.profile),
      detail: 'registered',
      at: r.registeredAt,
    })),
    ...submissions.map((s) => ({
      id: `sub:${s.id}`,
      kind: 'submitted' as const,
      name: displayName(s.participant.profile),
      detail: s.isPrivate
        ? `submitted ${s.step.title} (private)`
        : `submitted ${s.step.title}`,
      at: s.submittedAt,
    })),
    ...posts.map((p) => ({
      id: `post:${p.id}`,
      kind: 'posted' as const,
      name: displayName(p.participant.profile),
      detail: 'posted in the feed',
      at: p.createdAt,
    })),
    ...comments.map((c) => ({
      id: `cmt:${c.id}`,
      kind: 'commented' as const,
      name: displayName(c.participant.profile),
      detail: 'commented on a post',
      at: c.createdAt,
    })),
  ]

  items.sort((a, b) => b.at.getTime() - a.at.getTime())
  return items.slice(0, limit)
}
