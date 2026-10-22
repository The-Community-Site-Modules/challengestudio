/**
 * Every piece of content in the agency, grouped by the challenge it belongs to
 * and labelled with the workspace that challenge lives in.
 *
 * The workspace name is not decoration here. Two workspaces can hold a "Day 1 —
 * Getting started", and without the label the list would be a pile of
 * identical-looking steps with no way to tell whose is whose.
 */

import Link from 'next/link'
import { FileText, AlertCircle, ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { AgencyShell, CountStrip, NothingYet, WorkspaceTag } from '../_components/agency-shell'
import { getWorkspaceSummaries, getAgencyContent } from '../_lib/queries'

export const metadata = { title: 'Content — Challenge Studio' }
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Published', ACTIVE: 'Live',
  COMPLETED: 'Finished', ARCHIVED: 'Archived',
}

export default async function AgencyContentPage() {
  const user = await requireUser()
  const summaries = await getWorkspaceSummaries(user.id)
  const challenges = await getAgencyContent(summaries)

  const totalSteps = challenges.reduce((n, c) => n + c.steps.length, 0)
  const totalBlocks = challenges.reduce(
    (n, c) => n + c.steps.reduce((m, s) => m + s.blocks, 0), 0)
  // A published step with nothing in it is the one thing here worth chasing:
  // it is live and empty.
  const emptyPublished = challenges.reduce(
    (n, c) => n + c.steps.filter((s) => s.isPublished && s.blocks === 0).length, 0)

  return (
    <AgencyShell
      workspaces={summaries.map((s) => ({ slug: s.slug, name: s.name }))}
      userName={user.fullName ?? ''}
      userEmail={user.email}
      {...(user.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      eyebrow="Content"
      title="All content"
      description="Every day and block across every workspace. Open one in its builder to edit it."
    >
      {challenges.length === 0 ? (
        <NothingYet
          title="No content yet"
          body="Content appears here as soon as a challenge has its first day."
        />
      ) : (
        <>
          <CountStrip
            items={[
              { label: 'Challenges', value: challenges.length },
              { label: 'Days', value: totalSteps },
              { label: 'Blocks', value: totalBlocks },
              { label: 'Published but empty', value: emptyPublished },
            ]}
          />

          {emptyPublished > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {emptyPublished} published {emptyPublished === 1 ? 'day has' : 'days have'} no
                content. {emptyPublished === 1 ? 'It is' : 'They are'} visible to participants and
                empty.
              </span>
            </p>
          )}

          <div className="mt-8 space-y-4">
            {challenges.map((c) => (
              <section key={c.id} className="rounded-xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3.5">
                  <WorkspaceTag name={c.workspaceName} />
                  <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-slate-900">
                    {c.title}
                  </h2>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <Link
                    href={`/ws/${c.workspaceSlug}/challenges/${c.slug}/builder`}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  >
                    Open builder <ArrowRight className="h-3 w-3" />
                  </Link>
                </header>

                {c.steps.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">
                    No days yet. Add the first one in the builder.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {c.steps.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 px-5 py-2.5 text-sm"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600">
                          {s.order}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-slate-900">{s.title}</span>
                        <span
                          className={cn(
                            'shrink-0 text-xs tabular-nums',
                            s.isPublished && s.blocks === 0
                              ? 'font-medium text-amber-700'
                              : 'text-slate-500'
                          )}
                        >
                          <FileText className="mr-1 inline h-3 w-3" />
                          {s.blocks} {s.blocks === 1 ? 'block' : 'blocks'}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            s.isPublished
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {s.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </AgencyShell>
  )
}
