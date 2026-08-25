import { redirect }    from 'next/navigation'
import Link            from 'next/link'
import { ArrowLeft }   from 'lucide-react'
import { Separator }   from '@/components/ui/separator'
import { Badge }       from '@/components/ui/badge'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db }          from '@/lib/db'
import { BuilderClient } from './_components/builder-client'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export default async function BuilderPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params

  // Auth + workspace
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  // Load challenge
  const challenge = await db.challenge.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          contentBlocks: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  const statusMap: Record<string, 'draft' | 'published' | 'active' | 'completed' | 'archived'> = {
    DRAFT:     'draft',
    PUBLISHED: 'published',
    ACTIVE:    'active',
    COMPLETED: 'completed',
    ARCHIVED:  'archived',
  }
  const status = statusMap[challenge.status as string] ?? 'draft'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/20">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/ws/${workspaceSlug}/challenges`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{challenge.title}</p>
            <p className="text-xs text-muted-foreground">Builder</p>
          </div>
          <Badge variant={status === 'published' || status === 'active' ? 'success' : status === 'draft' ? 'warning' : 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </header>

      {/* Client builder — receives real data */}
      <BuilderClient
        challenge={{
          id:          challenge.id,
          title:       challenge.title,
          slug:        challenge.slug,
          status:      challenge.status as string,
          workspaceSlug,
        }}
        initialSteps={challenge.steps.map(s => ({
          id:              s.id,
          title:           s.title,
          order:           s.order,
          position:        s.order,
          type:            (s.stepType as 'orientation' | 'day' | 'graduation' | 'bonus') || 'day',
          stepType:        s.stepType,
          status:          (s.isPublished ? 'published' : s.contentBlocks.length > 0 ? 'draft' : 'empty') as 'published' | 'draft' | 'empty',
          blockCount:      s.contentBlocks.length,
          isRequired:      s.isRequired,
          isPublished:     s.isPublished,
          estimatedMinutes: s.estimatedMinutes,
          completionMethod: s.completionMethod,
          pointsXp:        s.pointsXp,
          blocks: s.contentBlocks.map(b => ({
            id:       b.id,
            type:     (b.type as string).toLowerCase(),
            label:    (b.type as string).toLowerCase(),
            order:    b.order,
            payload:  b.data as Record<string, string>,
            required: false,
            expanded: false,
          })),
        }))}
      />
    </div>
  )
}
