import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Zap, Users, Layers } from 'lucide-react'
import { requireUser, getUserWorkspaces } from '@/lib/auth/session'
import { WorkspaceHeader } from '@/components/workspace/workspace-header'
import { UrlToast } from '@/components/shared/url-toast'
import { createWorkspaceAction } from '../actions'
import { CreateWorkspace } from './_components/create-workspace'

export const metadata = { title: 'Your workspaces — Challenge Studio' }

// Decoration only — the workspace name and address carry the identity. Keyed by
// position so a workspace keeps the same tile between visits.
const TILES = [
  'from-violet-500 to-indigo-500',
  'from-orange-500 to-amber-500',
  'from-sky-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-blue-500 to-indigo-500',
]

const ROLE_STYLE: Record<string, string> = {
  OWNER:  'bg-primary/10 text-primary',
  ADMIN:  'bg-blue-50 text-blue-700',
  MEMBER: 'bg-muted text-muted-foreground',
}

export default async function DashboardPage() {
  const user = await requireUser()
  const memberships = await getUserWorkspaces(user.id)

  // One workspace is not a choice — go straight to it.
  if (memberships.length === 1) {
    redirect(`/ws/${memberships[0]!.workspace.slug}`)
  }

  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0]
  const names = memberships.map((m) => m.workspace.name)

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/30">
      <UrlToast />

      <WorkspaceHeader
        userName={user.fullName ?? ''}
        userEmail={user.email}
        {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {memberships.length > 0 ? `Welcome back, ${firstName}` : `Welcome, ${firstName}`}
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              {memberships.length > 0
                ? 'Choose a workspace to keep building, or start a new one.'
                : 'Create your first workspace to start building challenges.'}
            </p>
          </div>
          {memberships.length > 0 && (
            <CreateWorkspace
              createAction={createWorkspaceAction}
              existingNames={names}
              variant="button"
            />
          )}
        </header>

        {memberships.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Zap className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">No workspaces yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map(({ workspace, role }, i) => (
              <Link
                key={workspace.id}
                href={`/ws/${workspace.slug}`}
                className="group flex min-h-[168px] flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  {workspace.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={workspace.logoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${TILES[i % TILES.length]} text-lg font-bold text-white`}
                      aria-hidden="true"
                    >
                      {workspace.name.trim().charAt(0).toUpperCase() || 'W'}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${ROLE_STYLE[role] ?? ROLE_STYLE.MEMBER}`}>
                    {role.toLowerCase()}
                  </span>
                </div>

                <h2 className="mt-4 truncate font-semibold text-foreground">{workspace.name}</h2>
                {/* The address distinguishes same-named workspaces, so it is not
                    decoration — it is the only thing telling them apart. */}
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  /ws/{workspace.slug}
                </p>

                <dl className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <dt className="sr-only">Challenges</dt>
                    <dd className="tabular-nums">{workspace._count.challenges}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <dt className="sr-only">Members</dt>
                    <dd className="tabular-nums">{workspace._count.members}</dd>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </dl>
              </Link>
            ))}

            <CreateWorkspace createAction={createWorkspaceAction} existingNames={names} />
          </div>
        )}
      </main>
    </div>
  )
}
