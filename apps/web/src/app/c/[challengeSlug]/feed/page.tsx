// Route: /c/[challengeSlug]/feed — the challenge community feed.
//
// This was four hardcoded posts from Robert Evans, Aisha P., Tom K. and
// Marcus J., with invented reaction counts, shown to every participant of
// every challenge. It reads the real feed now.

import { redirect, notFound } from 'next/navigation'
import { ChallengeNav } from '@/components/participant/challenge-nav'
import { getCurrentUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { FeedClient, type FeedPostView } from './_components/feed-client'

interface Props { params: Promise<{ challengeSlug: string }> }

export const metadata = { title: 'Community — Challenge Studio' }

export default async function FeedPage({ params }: Props) {
  const { challengeSlug } = await params

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/feed`)
  }

  const challenge = await db.challenge.findFirst({
    where:  { slug: challengeSlug },
    select: {
      id: true, title: true, workspaceId: true,
      workspace: { select: { name: true } },
    },
  })
  if (!challenge) notFound()

  const me = await db.participant.findUnique({
    where:  { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true },
  })
  if (!me) redirect(`/c/${challengeSlug}`)
  if (me.status === 'PENDING') redirect(`/c/${challengeSlug}/welcome`)

  const canModerate = await hasPermission(user.id, challenge.workspaceId, 'community.moderate')

  // Hidden posts are left out entirely rather than shown as tombstones — a
  // removed post reappearing as "[removed]" is its own kind of noise.
  const posts = await db.feedPost.findMany({
    where:   { challengeId: challenge.id, isHidden: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, body: true, createdAt: true, participantId: true,
      participant: { select: { profile: { select: { fullName: true, email: true, avatarUrl: true } } } },
      step: { select: { title: true, order: true } },
      comments: {
        where:   { isHidden: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, body: true, createdAt: true, participantId: true,
          participant: { select: { profile: { select: { fullName: true, email: true, avatarUrl: true } } } },
        },
      },
      reactions: { select: { emoji: true, participantId: true } },
    },
  })

  const view: FeedPostView[] = posts.map((p) => {
    // Collapse reactions to a count per emoji, plus whether I am in each one.
    const counts = new Map<string, { count: number; mine: boolean }>()
    for (const r of p.reactions) {
      const entry = counts.get(r.emoji) ?? { count: 0, mine: false }
      entry.count += 1
      if (r.participantId === me.id) entry.mine = true
      counts.set(r.emoji, entry)
    }

    return {
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      authorName: p.participant.profile.fullName?.trim() || p.participant.profile.email,
      authorAvatar: p.participant.profile.avatarUrl,
      isMine: p.participantId === me.id,
      stepLabel: p.step ? `Day ${p.step.order + 1}` : null,
      reactions: [...counts].map(([emoji, v]) => ({ emoji, ...v })),
      comments: p.comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        authorName: c.participant.profile.fullName?.trim() || c.participant.profile.email,
        authorAvatar: c.participant.profile.avatarUrl,
        isMine: c.participantId === me.id,
      })),
    }
  })

  return (
    <div className="min-h-screen bg-slate-50/70">
      <ChallengeNav
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
        hostName={challenge.workspace.name}
      />
      <FeedClient
        challengeSlug={challengeSlug}
        posts={view}
        canModerate={canModerate}
      />
    </div>
  )
}
