import { redirect } from 'next/navigation'
import { LayoutGrid, Zap, Users, UserRound } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { UrlToast } from '@/components/shared/url-toast'
import { GlobalSidebar } from './_components/global-sidebar'
import { createWorkspaceAction } from '../actions'
import { CreateWorkspace } from './_components/create-workspace'
import { WorkspaceBrowser, type WorkspaceCardData } from './_components/workspace-browser'
import { getWorkspaceSummaries, getPickerTotals } from './_lib/queries'

export const metadata = { title: 'Workspaces — Challenge Studio' }
export const dynamic = 'force-dynamic'

/** Two digits below ten, the way a counter reads — 07 rather than 7. */
function pad(n: number) {
  return n < 10 ? `0${n}` : n.toLocaleString()
}

export default async function DashboardPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)

  // One workspace is not a choice — go straight to it.
  if (summaries.length === 1) {
    redirect(`/ws/${summaries[0]!.slug}`)
  }

  const totals = await getPickerTotals(user.id, summaries)
  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0]
  const names = summaries.map((s) => s.name)

  const cards: WorkspaceCardData[] = summaries.map((s) => ({
    ...s,
    lastActivity: s.lastActivity.toISOString(),
    joinedAt: s.joinedAt.toISOString(),
  }))

  const stats = [
    { icon: LayoutGrid, label: 'Workspaces',         value: pad(totals.workspaces) },
    { icon: Zap,        label: 'Active challenges',  value: pad(totals.activeChallenges) },
    { icon: Users,      label: 'Team members',       value: pad(totals.teamMembers) },
    { icon: UserRound,  label: 'Participants',       value: pad(totals.participants) },
  ]

  return (
    <>
      <UrlToast />

      {/* Same shell as a workspace: a full-height sidebar and scrolling that
          belongs to <main>, so the two levels read as one application. */}
      <GlobalSidebar
        workspaces={summaries.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
        userName={user.fullName ?? ''}
        userEmail={user.email}
        {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-10 lg:py-12">

          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Workspaces
              </p>
              <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                Choose a workspace to continue building, or create a new one to start
                something new.
              </p>
            </div>
            <CreateWorkspace
              createAction={createWorkspaceAction}
              existingNames={names}
              variant="button"
            />
          </header>

          {summaries.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Zap className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                No workspaces yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                A workspace holds your challenges, your team, and your branding.
                Most people only ever need one.
              </p>
              <div className="mt-6 flex justify-center">
                <CreateWorkspace
                  createAction={createWorkspaceAction}
                  existingNames={names}
                  variant="button"
                />
              </div>
            </div>
          ) : (
            <>
              {/* A strip rather than four cards — this is context for the choice
                  below, not the subject of the page. */}
              <dl className="mt-8 grid grid-cols-2 rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
                {stats.map(({ icon: Icon, label, value }, i) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-center gap-3 px-5 py-4',
                      // Two columns: a rule between the pair, and above the
                      // second row. Four columns: rules between all of them and
                      // none above.
                      i % 2 === 1 && 'border-l border-slate-100',
                      i > 1 && 'border-t border-slate-100 lg:border-t-0',
                      i > 0 && 'lg:border-l lg:border-slate-100'
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <dd className="text-[20px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                        {value}
                      </dd>
                      <dt className="mt-1 truncate text-[13px] text-slate-500">{label}</dt>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="mt-10">
                <WorkspaceBrowser
                  workspaces={cards}
                  onCreate={
                    <CreateWorkspace
                      createAction={createWorkspaceAction}
                      existingNames={names}
                      variant="tile"
                    />
                  }
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
