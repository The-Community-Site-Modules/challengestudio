// Route: /account/profile — the signed-in user's own settings

import { requireUser }  from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { UrlToast }     from '@/components/shared/url-toast'
import { updateProfileAction, requestPasswordChangeAction } from '../actions'
import { ProfileForm } from './_components/profile-form'

export const metadata = { title: 'Settings — Challenge Studio' }

export default async function ProfilePage() {
  const user = await requireUser()

  // Verification lives on the auth user, not the profiles row. Reading it here
  // keeps the badge tied to something real rather than assumed.
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const emailVerified = Boolean(authUser?.email_confirmed_at)

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50/70">
      <UrlToast />

      <div className="mx-auto w-full max-w-[880px] px-5 pb-20 pt-10 sm:px-8 lg:pt-12">

        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
            Profile &amp; Account
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Manage your personal details and account preferences.
          </p>
        </header>

        <div className="mt-9 lg:mt-10">
          <ProfileForm
            initialName={user.fullName ?? ''}
            initialAvatarUrl={user.avatarUrl ?? ''}
            email={user.email}
            emailVerified={emailVerified}
            updateAction={updateProfileAction}
            requestPasswordChange={requestPasswordChangeAction}
          />
        </div>
      </div>
    </main>
  )
}
