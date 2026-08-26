// Route: /ws/[workspaceSlug]/content
//
// Every step and content block in the workspace, in one place. The builder edits
// one challenge at a time, so this is the only view that answers "where is the
// content, and which steps are still empty".

import Link from 'next/link'
import { FileText, ArrowRight, AlertCircle } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export const metadata = { title: 'Content — Challenge Studio' }

export default async function ContentPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenges = await db.challenge.findMany({
    where:  { workspaceId: workspace.id },
    select: {
      id: true, title: true, slug: true, status: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true, isPublished: true,
          _count: { select: { contentBlocks: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalSteps  = challenges.reduce((n, c) => n + c.steps.length, 0)
  const totalBlocks = challenges.reduce(
    (n, c) => n + c.steps.reduce((m, s) => m + s._count.contentBlocks, 0), 0)
  // An empty published step is the one thing here worth chasing: it is live and
  // has nothing in it.
  const emptyPublished = challenges.reduce(
    (n, c) => n + c.steps.filter((s) => s.isPublished && s._count.contentBlocks === 0).length, 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Content"
            description="Every step and block across your challenges. Edit one in its builder."
          />

          {challenges.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <FileText className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                Nothing to show yet
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
                Content lives inside challenge steps. Create a challenge and its steps
                and blocks will be listed here.
              </p>
              <Link
                href={`/ws/${workspaceSlug}/challenges/new`}
                className="mt-6 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Create a challenge
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-5 text-[13px] text-slate-500">
                {totalSteps} step{totalSteps === 1 ? '' : 's'} · {totalBlocks} block
                {totalBlocks === 1 ? '' : 's'} across {challenges.length} challenge
                {challenges.length === 1 ? '' : 's'}
              </p>

              {emptyPublished > 0 && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {emptyPublished} published step{emptyPublished === 1 ? ' has' : 's have'} no
                  content. Participants reaching {emptyPublished === 1 ? 'it' : 'them'} would
                  find an empty page.
                </p>
              )}

              <div className="mt-6 space-y-4">
                {challenges.map((c) => (
                  <section
                    key={c.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                          {c.title}
                        </h2>
                        <p className="mt-0.5 text-[12px] uppercase tracking-wide text-slate-400">
                          {String(c.status).toLowerCase()} · {c.steps.length} step
                          {c.steps.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <Link
                        href={`/ws/${workspaceSlug}/challenges/${c.slug}/builder`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        Open builder <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {c.steps.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-slate-500">
                        No steps yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {c.steps.map((s) => {
                          const empty = s._count.contentBlocks === 0
                          return (
                            <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                              <span className="w-7 shrink-0 text-[12px] tabular-nums text-slate-400">
                                {s.order + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                                {s.title}
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 text-[12px]',
                                  s.isPublished ? 'text-emerald-700' : 'text-slate-400'
                                )}
                              >
                                {s.isPublished ? 'Published' : 'Draft'}
                              </span>
                              <span
                                className={cn(
                                  'w-20 shrink-0 text-right text-[13px] tabular-nums',
                                  empty && s.isPublished ? 'text-amber-700' : 'text-slate-500'
                                )}
                              >
                                {s._count.contentBlocks} block{s._count.contentBlocks === 1 ? '' : 's'}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
