import Link from 'next/link'
import { Plus, Search, Filter, Zap, X } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { ChallengeCard }    from '@/components/challenge/challenge-card'
import { PageHeader }       from '@/components/shared/page-header'
import { EmptyState }       from '@/components/shared/empty-state'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { formatInZone } from '@/lib/time/zoned'

interface Props {
  params:       Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ tab?: string; q?: string; mode?: string }>
}

/** How each mode reads in the filter. Only modes in use are offered. */
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
  const { tab = 'all', q: rawQ = '', mode: rawMode = '' } = await searchParams
  const q = rawQ.trim()
  const mode = MODE_LABEL[rawMode] ? rawMode : ''

  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  // Fetch all challenges for this workspace
  const challenges = await db.challenge.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: { select: { participants: true, steps: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Search and mode first, then the tab — so the counts on the tabs describe
  // what the search found, and "Live (2)" means two live ones that match.
  //
  // In memory rather than in the query: a workspace has dozens of challenges,
  // not thousands, and the tab counts need the whole set anyway.
  const needle = q.toLowerCase()
  const matching = challenges.filter((c) =>
    (!mode || c.mode === mode) &&
    (!needle ||
      c.title.toLowerCase().includes(needle) ||
      (c.description ?? '').toLowerCase().includes(needle) ||
      (c.promise ?? '').toLowerCase().includes(needle))
  )
  const modesInUse = [...new Set(challenges.map((c) => c.mode as string))]
    .filter((m) => MODE_LABEL[m])

  /** A link that keeps the search and mode while changing one thing. */
  const withParams = (extra: Record<string, string>) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (mode) p.set('mode', mode)
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return `/ws/${workspaceSlug}/challenges?${p.toString()}`
  }
  const searching = Boolean(q || mode)

  // Filter by tab
  const filtered = tab === 'all' ? matching : matching.filter(c => {
    const s = (c.status as string).toLowerCase()
    if (tab === 'live')      return s === 'published' || s === 'active'
    if (tab === 'draft')     return s === 'draft'
    if (tab === 'scheduled') return s === 'published' && c.startsAt && c.startsAt > new Date()
    if (tab === 'completed') return s === 'completed' || s === 'archived'
    return true
  })

  // Tab counts
  const counts = {
    all:       matching.length,
    live:      matching.filter(c => ['PUBLISHED','ACTIVE'].includes(c.status as string)).length,
    draft:     matching.filter(c => c.status === 'DRAFT').length,
    scheduled: matching.filter(c => c.status === 'PUBLISHED' && c.startsAt && c.startsAt > new Date()).length,
    completed: matching.filter(c => ['COMPLETED','ARCHIVED'].includes(c.status as string)).length,
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
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

        {/* Search and filter. A plain GET form: no client code, and the
            result lives in the URL, so it survives a reload and can be sent
            to someone. Both controls did nothing before — the input had no
            name and the button no handler. */}
        <form
          method="get"
          action={`/ws/${workspaceSlug}/challenges`}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search challenges..."
              aria-label="Search challenges"
              className="pl-9"
            />
          </div>
          {modesInUse.length > 1 && (
            <select
              name="mode"
              defaultValue={mode}
              aria-label="Filter by mode"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All modes</option>
              {modesInUse.map((m) => (
                <option key={m} value={m}>{MODE_LABEL[m]}</option>
              ))}
            </select>
          )}
          <Button type="submit" variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          {searching && (
            <Link
              href={tab === 'all' ? `/ws/${workspaceSlug}/challenges` : `/ws/${workspaceSlug}/challenges?tab=${tab}`}
              className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground sm:self-auto"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Link>
          )}
        </form>

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
                <Link href={withParams({ tab: key })}>
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
              status={(STATUS_MAP[c.status as string] ?? 'draft') as 'draft' | 'scheduled' | 'published' | 'active' | 'closed' | 'completed' | 'archived'}
              participantCount={c._count.participants}
              startsAt={c.startsAt ? formatInZone(c.startsAt, c.timezone, { month: 'short', day: 'numeric' }) : undefined}
              coverImageUrl={c.coverImageUrl}
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
        {filtered.length === 0 && challenges.length > 0 && (tab !== 'all' || searching) && (
          <div className="mt-8">
            <EmptyState
              icon={<Zap className="h-7 w-7" />}
              title="No challenges here"
              description={searching
                ? `Nothing matches${q ? ` "${q}"` : ''}${mode ? ` in ${MODE_LABEL[mode]}` : ''}.`
                : 'No challenges match this filter yet.'}
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
