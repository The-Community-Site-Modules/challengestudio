import Link from 'next/link'
import { Plus, Search, Filter, Zap } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { ChallengeCard }    from '@/components/challenge/challenge-card'
import { PageHeader }       from '@/components/shared/page-header'
import { EmptyState }       from '@/components/shared/empty-state'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'

interface Props {
  params:       Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ tab?: string }>
}

const STATUS_MAP: Record<string, string> = {
  DRAFT:     'draft',
  PUBLISHED: 'published',
  ACTIVE:    'active',
  COMPLETED: 'completed',
  ARCHIVED:  'archived',
}

const MODE_MAP: Record<string, string> = {
  SELF_PACED:       'evergreen',
  COHORT:           'cohort',
  LIVE_EVENT:       'marketing',
  DRIP:             'milestone',
  SPRINT:           'habit',
  EVERGREEN:        'evergreen',
  CERTIFICATION:    'milestone',
  CHALLENGE_LADDER: 'milestone',
}

export default async function ChallengesPage({ params, searchParams }: Props) {
  const { workspaceSlug } = await params
  const { tab = 'all' }   = await searchParams

  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  // Fetch all challenges for this workspace
  const challenges = await db.challenge.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: { select: { participants: true, steps: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter by tab
  const filtered = tab === 'all' ? challenges : challenges.filter(c => {
    const s = (c.status as string).toLowerCase()
    if (tab === 'live')      return s === 'published' || s === 'active'
    if (tab === 'draft')     return s === 'draft'
    if (tab === 'scheduled') return s === 'published' && c.startsAt && c.startsAt > new Date()
    if (tab === 'completed') return s === 'completed' || s === 'archived'
    return true
  })

  // Tab counts
  const counts = {
    all:       challenges.length,
    live:      challenges.filter(c => ['PUBLISHED','ACTIVE'].includes(c.status as string)).length,
    draft:     challenges.filter(c => c.status === 'DRAFT').length,
    scheduled: challenges.filter(c => c.status === 'PUBLISHED' && c.startsAt && c.startsAt > new Date()).length,
    completed: challenges.filter(c => ['COMPLETED','ARCHIVED'].includes(c.status as string)).length,
  }

  return (
    <div className="flex flex-1">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto p-8">
        <PageHeader
          title="Challenges"
          description="Build, manage, and track all your challenges."
          action={
            <Button asChild>
              <Link href={`/ws/${workspaceSlug}/challenges/new`}>
                <Plus className="mr-2 h-4 w-4" /> New Challenge
              </Link>
            </Button>
          }
        />

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search challenges..." className="pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start">
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} className="mt-6">
          <TabsList>
            {([
              ['all',       'All'],
              ['live',      'Live'],
              ['draft',     'Draft'],
              ['scheduled', 'Scheduled'],
              ['completed', 'Completed'],
            ] as const).map(([key, label]) => (
              <TabsTrigger key={key} value={key} asChild>
                <Link href={`/ws/${workspaceSlug}/challenges?tab=${key}`}>
                  {label} ({counts[key]})
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ChallengeCard
              key={c.id}
              id={c.id}
              slug={c.slug}
              workspaceSlug={workspaceSlug}
              title={c.title}
              promise={c.promise ?? c.description ?? ''}
              mode={(MODE_MAP[c.mode as string] ?? 'evergreen') as 'marketing' | 'evergreen' | 'cohort' | 'internal' | 'paid' | 'team' | 'habit' | 'milestone'}
              status={(STATUS_MAP[c.status as string] ?? 'draft') as 'draft' | 'scheduled' | 'published' | 'closed' | 'completed' | 'archived'}
              participantCount={c._count.participants}
              startsAt={c.startsAt ? c.startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
            />
          ))}

          {/* Create new card */}
          <Link
            href={`/ws/${workspaceSlug}/challenges/new`}
            className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <Plus className="h-8 w-8" />
            <span className="mt-2 text-sm font-medium">Create new challenge</span>
          </Link>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && tab !== 'all' && (
          <div className="mt-8">
            <EmptyState
              icon={<Zap className="h-7 w-7" />}
              title="No challenges here"
              description="No challenges match this filter yet."
            />
          </div>
        )}

        {challenges.length === 0 && (
          <div className="mt-8">
            <EmptyState
              icon={<Zap className="h-7 w-7" />}
              title="No challenges yet"
              description="Create your first challenge and start guiding transformations."
              action={
                <Button asChild>
                  <Link href={`/ws/${workspaceSlug}/challenges/new`}>
                    <Plus className="mr-2 h-4 w-4" /> Create challenge
                  </Link>
                </Button>
              }
            />
          </div>
        )}
      </main>
    </div>
  )
}
