// Route: /account/notifications — participant email preferences (PRD §15.2).
//
// Was a one-line placeholder. Preferences are per workspace on purpose: §15.2
// warns that "workspace unsubscribe behavior should not accidentally
// unsubscribe a person from unrelated products or workspaces", so each
// workspace this person has a relationship with gets its own switch.

import { Mail, ShieldCheck } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { MESSAGES } from '@/lib/communications'
import { PreferenceToggle } from './_components/preference-toggle'

export const metadata = { title: 'Notifications — Challenge Studio' }

export default async function NotificationsPage() {
  const user = await requireUser()

  // Every workspace they take part in or belong to.
  const [participations, memberships, prefs] = await Promise.all([
    db.participant.findMany({
      where:  { profileId: user.id },
      select: { challenge: { select: { workspace: { select: { id: true, name: true } } } } },
    }),
    db.workspaceMember.findMany({
      where:  { profileId: user.id },
      select: { workspace: { select: { id: true, name: true } } },
    }),
    db.notificationPreference.findMany({
      where:  { profileId: user.id },
      select: { workspaceId: true, unsubscribed: true },
    }),
  ])

  const workspaces = new Map<string, string>()
  for (const p of participations) workspaces.set(p.challenge.workspace.id, p.challenge.workspace.name)
  for (const m of memberships)    workspaces.set(m.workspace.id, m.workspace.name)

  const unsubscribed = new Set(prefs.filter(p => p.unsubscribed).map(p => p.workspaceId))
  const essential = MESSAGES.filter(m => m.essential)

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70">
      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-10 sm:px-8 lg:pt-12">

        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Choose which challenge emails you get, one workspace at a time.
          </p>
        </header>

        <section className="mt-9 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
              <Mail className="h-4 w-4 text-slate-500" />
              Challenge email
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Turning a workspace off affects only that workspace.
            </p>
          </header>

          {workspaces.size === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500 sm:px-6">
              You are not part of any challenges yet, so there is nothing to set.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...workspaces].map(([id, name]) => (
                <PreferenceToggle
                  key={id}
                  workspaceId={id}
                  workspaceName={name}
                  initiallyUnsubscribed={unsubscribed.has(id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Being explicit about what a switch does not turn off. */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-5 sm:px-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            Always sent
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            These are how you get into your account and confirm what you signed up
            for, so they are sent whatever you choose above.
          </p>
          <ul className="mt-3 space-y-1.5">
            {essential.map((m) => (
              <li key={m.trigger} className="text-[13px] text-slate-700">
                {m.name}
                <span className="ml-2 text-slate-500">{m.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
