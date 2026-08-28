// Route: .../challenges/[challengeSlug]/community — moderation
//
// The participant feed lets an author take down their own post. This is the
// other half: a moderator seeing everything, including what has already been
// removed, and putting something back that was removed by mistake. Restoring
// is the reason hiding never deleted.

import { notFound, redirect } from 'next/navigation'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { ModerationClient, type ModPost } from './_components/moderation-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Community — Challenge Studio' }

export default async function CommunityPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  // Being a member is not enough — moderating is its own capability.
  if (!(await hasPermission(user.id, workspace.id, 'community.moderate'))) {
    redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)
  }

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true },
  })
  if (!challenge) notFound()

  const posts = await db.feedPost.findMany({
    where:   { challengeId: challenge.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, body: true, createdAt: true, isHidden: true,
      participant: { select: { profile: { select: { fullName: true, email: true, avatarUrl: true } } } },
      _count: { select: { reactions: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, body: true, createdAt: true, isHidden: true,
          participant: { select: { profile: { select: { fullName: true, email: true, avatarUrl: true } } } },
        },
      },
    },
  })

  const view: ModPost[] = posts.map((p) => ({
    id: p.id,
    body: p.body,
    createdAt: p.createdAt.toISOString(),
    authorName: p.participant.profile.fullName?.trim() || p.participant.profile.email,
    authorAvatar: p.participant.profile.avatarUrl,
    isHidden: p.isHidden,
    reactionCount: p._count.reactions,
    comments: p.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: c.participant.profile.fullName?.trim() || c.participant.profile.email,
      authorAvatar: c.participant.profile.avatarUrl,
      isHidden: c.isHidden,
    })),
  }))

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Community"
            description={`Everything posted in ${challenge.title}. Removing hides a post from participants without deleting it.`}
          />
          <ModerationClient
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            posts={view}
          />
        </div>
      </main>
    </div>
  )
}
