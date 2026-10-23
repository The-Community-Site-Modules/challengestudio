// Route: /auth/set-password — create a password after an email-link sign-in.
//
// The auth callback sends people here when they signed in by link and their
// account has no password. Everyone who registers for a challenge starts that
// way, and a link only completes in the browser that asked for it — so the day
// they open one on their phone, they need something else to sign in with.
//
// It offers; it does not insist. "Skip for now" carries on to where they were
// going, and the next link sign-in will offer again.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/redirect'
import { knowsPassword } from '@/lib/auth/password'
import { AuthShell } from '../../_components/auth-shell'
import { SetPasswordForm } from './_components/set-password-form'

export const metadata = { title: 'Create a password — Challenge Studio' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ next?: string }>
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { next: rawNext } = await searchParams
  // Only a path on this site — it comes from the URL.
  const next = safeNext(rawNext ?? null) ?? '/dashboard'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/auth/set-password?next=${encodeURIComponent(next)}`)}`)

  // Already chose one: nothing to offer. Straight on, so a bookmarked or
  // back-buttoned visit does not ask twice.
  if (knowsPassword(user)) redirect(next)

  return (
    <AuthShell>
      <SetPasswordForm next={next} email={user.email ?? ''} />
    </AuthShell>
  )
}
