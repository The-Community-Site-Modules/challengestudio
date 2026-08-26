// Route: .../challenges/[challengeSlug]/preview
//
// What a participant would see, rendered from the same components the day page
// uses — see components/challenge/content-blocks. A preview built from its own
// renderers would drift from the thing it previews, which is its only job.

import { notFound } from 'next/navigation'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'
import { db } from '@/lib/db'
import { PreviewClient, type PreviewStep } from './_components/preview-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Preview — Challenge Studio' }

export default async function PreviewPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  // Draft content is not public, so seeing it requires the same capability as
  // editing it — membership alone is not enough.
  await requirePermission(user.id, workspace.id, 'challenge.preview')

  const challenge = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      title: true, status: true, promise: true, description: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true, isRequired: true, isPublished: true,
          estimatedMinutes: true, pointsXp: true,
          contentBlocks: {
            orderBy: { order: 'asc' },
            select: { id: true, type: true, data: true },
          },
        },
      },
    },
  })

  if (!challenge) notFound()

  const steps: PreviewStep[] = challenge.steps.map((s) => ({
    id: s.id,
    title: s.title,
    order: s.order,
    isRequired: s.isRequired,
    isPublished: s.isPublished,
    estimatedMinutes: s.estimatedMinutes,
    pointsXp: s.pointsXp,
    // The block editor stores lowercase type keys; the column is an uppercase
    // enum. Normalise here so the renderer only has to know one form.
    blocks: s.contentBlocks.map((b) => ({
      id: b.id,
      type: String(b.type).toLowerCase(),
      data: (b.data ?? {}) as Record<string, string>,
    })),
  }))

  return (
    <PreviewClient
      workspaceSlug={workspaceSlug}
      challengeSlug={challengeSlug}
      challengeTitle={challenge.title}
      challengeStatus={String(challenge.status)}
      promise={challenge.promise}
      description={challenge.description}
      steps={steps}
    />
  )
}
