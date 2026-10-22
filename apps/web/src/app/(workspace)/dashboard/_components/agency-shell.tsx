/**
 * The frame every agency-level page sits in.
 *
 * Five pages — workspaces, content, participants, team, analytics — all want
 * the same sidebar, the same scroll pane and the same column width. Repeating
 * that in each one is how two of them end up subtly different, and how the
 * `h-screen overflow-hidden lg:flex-row` contract from the layout gets broken
 * by a page that forgets to claim `flex-1` and own its own scrolling.
 *
 * Takes the signed-in person and their workspaces because the sidebar needs
 * both, and a server page is where they can be fetched.
 */

import { GlobalSidebar, type SidebarWorkspace } from './global-sidebar'

interface Props {
  workspaces: readonly SidebarWorkspace[]
  userName?: string
  userEmail?: string
  userAvatar?: string
  /** Shown above the content: a title, a sentence, and an optional control. */
  eyebrow: string
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function AgencyShell({
  workspaces, userName, userEmail, userAvatar,
  eyebrow, title, description, action, children,
}: Props) {
  return (
    <>
      <GlobalSidebar
        workspaces={workspaces}
        {...(userName ? { userName } : {})}
        {...(userEmail ? { userEmail } : {})}
        {...(userAvatar ? { userAvatar } : {})}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-10 lg:py-12">
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
                {title}
              </h1>
              {description && (
                <p className="mt-1.5 max-w-xl text-sm text-slate-500">{description}</p>
              )}
            </div>
            {action}
          </header>

          {children}
        </div>
      </main>
    </>
  )
}

/** A count with its label, in the strip these pages put under the header. */
export function CountStrip({ items }: {
  items: { label: string; value: string | number }[]
}) {
  return (
    <div className="mt-8 grid grid-cols-2 rounded-xl border border-slate-200 bg-white sm:grid-cols-4">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={[
            'px-5 py-4',
            i % 2 === 1 ? 'border-l border-slate-100' : '',
            i > 1 ? 'border-t border-slate-100 sm:border-t-0' : '',
            i > 0 ? 'sm:border-l sm:border-slate-100' : '',
          ].join(' ')}
        >
          <span className="block text-[20px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
            {s.value}
          </span>
          <span className="mt-1 block text-[13px] leading-tight text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/** The same empty state on every one of these pages. */
export function NothingYet({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{body}</p>
    </div>
  )
}

/** The workspace a row belongs to, said the same way everywhere. */
export function WorkspaceTag({ name }: { name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-white text-[9px] font-bold text-slate-500">
        {name.trim().charAt(0).toUpperCase() || 'W'}
      </span>
      {name}
    </span>
  )
}
