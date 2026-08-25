// Route: /account/profile — the signed-in user's own profile

import { requireUser } from '@/lib/auth/session'
import { PageHeader }  from '@/components/shared/page-header'
import { UrlToast }    from '@/components/shared/url-toast'
import { updateProfileAction, requestPasswordChangeAction } from '../actions'
import { ProfileForm } from './_components/profile-form'

export const metadata = { title: 'Profile — Challenge Studio' }

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <UrlToast />
      <div className="max-w-2xl">
        <PageHeader
          title="Profile"
          description="Your name, avatar, and sign-in details."
        />
        <div className="mt-8">
          <ProfileForm
            initialName={user.fullName ?? ''}
            initialAvatarUrl={user.avatarUrl ?? ''}
            email={user.email}
            updateAction={updateProfileAction}
            requestPasswordChange={requestPasswordChangeAction}
          />
        </div>
      </div>
    </main>
  )
}
