import { redirect } from 'next/navigation'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { safeZone } from '@/lib/time/zoned'
import { BuilderClient, type BuilderDay } from './_components/builder-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

const MODE_LABEL: Record<string, string> = {
  SELF_PACED:       'Self-paced',
  COHORT:           'Cohort',
  LIVE_EVENT:       'Live event',
  DRIP:             'Drip',
  SPRINT:           'Sprint',
  EVERGREEN:        'Evergreen',
  CERTIFICATION:    'Certification',
  CHALLENGE_LADDER: 'Challenge ladder',
}

/**
 * Formatted here rather than in the client, so the challenge's own timezone
 * decides what "Wed, Oct 14 · 6:00 AM" means — not whichever machine the
 * creator happens to be sitting at. A creator in Karachi scheduling for a
 * US-Pacific challenge must see the challenge's clock.
 */
function formatUnlock(at: Date | null, timeZone: string): string | null {
  if (!at) return null
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
    timeZone,
  })
    .format(at)
    .replace(',', '')
    .replace(/(\d{2}:\d{2})$/, '· $1')
}

/** `required` and `points` live inside the block's `data` JSON — see actions.ts. */
function readFlag(data: unknown, key: string): unknown {
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[key] : undefined
}

export default async function BuilderPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)

  // Every draft block, for a role that can neither edit nor preview them. The
  // preview page already refused members; the builder showed them the same.
  if (!(await hasPermission(user.id, workspace.id, 'challenge.edit'))) {
    redirect(`/ws/${workspaceSlug}/challenges/${challengeSlug}/overview`)
  }

  const challenge = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { contentBlocks: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  // Deleting a day cascades to its submissions, so the confirm needs to be
  // able to say how much of somebody else's work is about to go.
  const submissionsByStep = new Map(
    (
      await db.submission.groupBy({
        by: ['stepId'],
        where: { step: { challengeId: challenge.id } },
        _count: { _all: true },
      })
    ).map((row) => [row.stepId, row._count._all])
  )

  const timeZone = safeZone(challenge.timezone)

  const initialSteps: BuilderDay[] = challenge.steps.map((s) => ({
    id:               s.id,
    title:            s.title,
    description:      s.description,
    order:            s.order,
    position:         s.order,
    type:             (s.stepType as 'orientation' | 'day' | 'graduation' | 'bonus') || 'day',
    stepType:         s.stepType,
    status:           (s.isPublished ? 'published' : s.contentBlocks.length > 0 ? 'draft' : 'empty') as
                        'published' | 'draft' | 'empty',
    blockCount:       s.contentBlocks.length,
    isRequired:       s.isRequired,
    isPublished:      s.isPublished,
    estimatedMinutes: s.estimatedMinutes,
    completionMethod: s.completionMethod,
    pointsXp:         s.pointsXp,
    unlockRule:       s.unlockRule,
    tomorrowTeaser:   s.tomorrowTeaser,
    dayImageUrl:      s.dayImageUrl,
    unlocksAtLabel:   formatUnlock(s.availableAt, timeZone),
    submissionCount:  submissionsByStep.get(s.id) ?? 0,
    blocks: s.contentBlocks.map((b) => {
      const points = Number(readFlag(b.data, 'points'))
      return {
        id:       b.id,
        type:     (b.type as string).toLowerCase(),
        label:    (b.type as string).toLowerCase(),
        payload:  b.data as Record<string, string>,
        required: readFlag(b.data, 'required') === true,
        points:   Number.isFinite(points) && points > 0 ? points : 0,
        expanded: false,
      }
    }),
  }))

  return (
    <BuilderClient
      challenge={{
        id:            challenge.id,
        title:         challenge.title,
        slug:          challenge.slug,
        status:        challenge.status as string,
        modeLabel:     MODE_LABEL[challenge.mode as string] ?? 'Self-paced',
        workspaceSlug,
      }}
      initialSteps={initialSteps}
    />
  )
}
