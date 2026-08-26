import { getCurrentUser } from '@/lib/auth/session'
import { SettingsNav }    from './_components/settings-nav'

// Account shell — the signed-in user's own pages, outside any workspace.
//
// Same model as the workspace shell: no top bar, a full-height sidebar that
// carries the account menu, and scrolling that belongs to <main> rather than
// the document, so the sidebar stays put instead of riding up with the content.
//
// `relative` matters: Tailwind's .sr-only is position:absolute, and with no
// positioned ancestor it resolves against the initial containing block, which
// grows the document and leaves a stray scrollbar behind the fixed sidebar.

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="relative flex h-screen flex-col overflow-hidden lg:flex-row">
      <SettingsNav
        userName={user?.fullName ?? ''}
        userEmail={user?.email ?? ''}
        {...(user?.avatarUrl ? { userAvatar: user.avatarUrl } : {})}
      />
      {children}
    </div>
  )
}
