// Route: .../challenges/[challengeSlug]/communications
//
// Templates and the delivery log (PRD §15.1, §27). Was placeholder text.
//
// Two honesty points are built into this page. Messages whose trigger is the
// clock are marked "Not scheduled", because the job runner is OD-04 and still
// an open decision — they can be edited, they will not fire. And the delivery
// log shows skips and failures rather than only successes, since §27 asks for
// failures to be observable and a silently skipped message is the same problem.

import { notFound } from 'next/navigation'
import { Mail, AlertCircle } from 'lucide-react'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { MESSAGES } from '@/lib/communications'
import { cn } from '@/lib/utils'
import { TemplateEditor, type TemplateRow } from './_components/template-editor'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Communications — Challenge Studio' }

/** How each delivery status reads, and how loudly. */
const STATUS: Record<string, { label: string; tone: string }> = {
  sent:                  { label: 'Sent',              tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  failed:                { label: 'Failed',            tone: 'bg-red-50 text-red-700 ring-red-100' },
  pending:               { label: 'Pending',           tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  skipped_unsubscribed:  { label: 'Skipped — opted out', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
  skipped_disabled:      { label: 'Skipped — turned off', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export default async function CommunicationsPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, title: true },
  })
  if (!challenge) notFound()

  const [overrides, deliveries] = await Promise.all([
    db.messageTemplate.findMany({
      where:  { challengeId: challenge.id },
      select: { trigger: true, enabled: true, subject: true, body: true },
    }),
    db.messageDelivery.findMany({
      where:   { challengeId: challenge.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, trigger: true, status: true, recipientEmail: true,
        error: true, provider: true, createdAt: true,
      },
    }),
  ])

  const byTrigger = new Map(overrides.map(o => [o.trigger, o]))

  const templates: TemplateRow[] = MESSAGES.map((m) => {
    const saved = byTrigger.get(m.trigger)
    return {
      trigger: m.trigger,
      name: m.name,
      when: m.when,
      firing: m.firing,
      essential: m.essential,
      enabled: saved?.enabled ?? true,
      subject: saved?.subject ?? '',
      body: saved?.body ?? '',
      defaultSubject: m.defaultSubject,
      defaultBody: m.defaultBody,
      variables: m.variables,
    }
  })

  const scheduled = MESSAGES.filter(m => m.firing === 'scheduled').length

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[900px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Communications"
            description="The emails this challenge sends, and what has gone out."
          />

          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            {scheduled} of these fire on a schedule rather than on something a
            participant does. Scheduled sending is not configured yet, so those
            can be written and turned on but will not go out until it is.
          </p>

          <TemplateEditor
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            templates={templates}
          />

          {/* Delivery log */}
          <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Mail className="h-4 w-4 text-slate-400" />
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
                Delivery log
              </h2>
              <span className="ml-auto text-[12px] text-slate-400">
                {deliveries.length === 50 ? 'last 50' : `${deliveries.length} total`}
              </span>
            </header>

            {deliveries.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Nothing sent yet. Every attempt appears here — including the ones
                deliberately skipped, so you can tell those from a failure.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {deliveries.map((d) => {
                  const s = STATUS[d.status] ?? { label: d.status, tone: 'bg-slate-100 text-slate-600 ring-slate-200' }
                  return (
                    <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                        {d.recipientEmail}
                      </span>
                      <span className="shrink-0 text-[13px] text-slate-500">{d.trigger}</span>
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
                        s.tone
                      )}>
                        {s.label}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-slate-400">
                        {d.createdAt.toLocaleString(undefined, {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {d.error && (
                        <span className="w-full text-[12px] text-red-600">{d.error}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
