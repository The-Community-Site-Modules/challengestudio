import Link from 'next/link'
import { Plus, Zap, Users, TrendingUp, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ChallengeCard } from '@/components/challenge/challenge-card'
import { requireWorkspaceMember } from '@/lib/auth/session'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

// ── Placeholder data (replaced by DB queries in Milestone 4) ──────────────
const MOCK_CHALLENGES = [
  {
    id: '1', slug: '5-day-launch', workspaceSlug: 'acme-coaching',
    title: '5-Day Business Launch Challenge',
    promise: 'Go from idea to your first paying client in just 5 days.',
    mode: 'marketing' as const, status: 'published' as const,
    participantCount: 247, completionRate: 61, startsAt: 'Aug 12',
  },
  {
    id: '2', slug: '30-day-momentum', workspaceSlug: 'acme-coaching',
    title: '30-Day Momentum Journey',
    promise: 'Build the daily habits that transform your business one step at a time.',
    mode: 'cohort' as const, status: 'scheduled' as const,
    participantCount: 0, startsAt: 'Sep 1',
  },
  {
    id: '3', slug: 'mindset-reset', workspaceSlug: 'acme-coaching',
    title: 'Mindset Reset Challenge',
    promise: 'Rewire your thinking for unstoppable results in 7 days.',
    mode: 'evergreen' as const, status: 'draft' as const,
    participantCount: 0,
  },
]

const MOCK_ACTIVITY = [
  { id: 1, text: 'Sarah K. completed Day 3 of 5-Day Launch', time: '2m ago', type: 'complete' },
  { id: 2, text: '14 new registrations for 5-Day Launch', time: '1h ago', type: 'register' },
  { id: 3, text: 'Marcus T. posted in the challenge feed', time: '3h ago', type: 'post' },
  { id: 4, text: '30-Day Momentum has 8 new sign-ups', time: '5h ago', type: 'register' },
]

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { workspaceSlug } = await params

  // Real auth + workspace name — rest of data is Milestone 4
  const { user, workspace } = await requireWorkspaceMember(workspaceSlug)
  const hasChalllenges = MOCK_CHALLENGES.length > 0
  const firstName = user.fullName?.split(' ')[0] ?? user.email.split('@')[0]

  return (
    <div className="flex flex-1">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border px-8 py-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
          </div>
          <Button asChild>
            <Link href={`/ws/${workspaceSlug}/challenges/new`}>
              <Plus className="mr-2 h-4 w-4" /> New Challenge
            </Link>
          </Button>
        </div>

        <div className="p-8 space-y-8">
          {/* Onboarding checklist — shown until workspace is set up */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-foreground">Get your workspace ready</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Complete these steps to launch your first challenge.
                </p>
              </div>
              <Badge variant="secondary">2 / 4 done</Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Add your logo and brand colors', done: true, href: `/ws/${workspaceSlug}/branding` },
                { label: 'Invite a team member', done: true, href: `/ws/${workspaceSlug}/team` },
                { label: 'Create your first challenge', done: false, href: `/ws/${workspaceSlug}/challenges/new` },
                { label: 'Publish a registration page', done: false, href: `/ws/${workspaceSlug}/challenges` },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    item.done
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <CheckCircle className={`h-4 w-4 shrink-0 ${item.done ? 'text-green-500' : 'text-muted-foreground'}`} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Participants"
              value="247"
              trend={{ value: 12, label: 'this week' }}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Active Challenges"
              value="1"
              sub="2 more scheduled"
              icon={<Zap className="h-5 w-5" />}
            />
            <StatCard
              label="Avg. Completion"
              value="61%"
              trend={{ value: 8, label: 'vs last challenge' }}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Days Completed"
              value="1,284"
              sub="across all challenges"
              icon={<CheckCircle className="h-5 w-5" />}
            />
          </div>

          {/* Challenges list */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Your Challenges</h2>
              <Link
                href={`/ws/${workspaceSlug}/challenges`}
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>

            {hasChalllenges ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {MOCK_CHALLENGES.map((c) => (
                  <ChallengeCard key={c.id} {...c} />
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
            ) : (
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
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="mb-4 text-base font-semibold text-foreground">Recent Activity</h2>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {MOCK_ACTIVITY.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        item.type === 'complete' ? 'bg-green-500' :
                        item.type === 'register' ? 'bg-primary' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm text-foreground">{item.text}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
