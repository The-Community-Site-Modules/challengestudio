/**
 * Supabase Auth Callback Route
 *
 * Handles all auth redirects from Supabase:
 * - Magic link sign-in (challenge registration flow)
 * - Email confirmation on signup
 * - Password reset link
 * - OAuth provider redirects
 *
 * Special params from challenge registration:
 *   ?challenge=<challengeId>  → create Participant row after auth
 *   ?name=<fullName>          → user's display name from registration form
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { enrollAfterAuth, EnrollmentRefusedError } from '@/lib/enrollment/register'
import { safeNext }                  from '@/lib/auth/redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code             = searchParams.get('code')
  // Only a path on this site. Taken raw, `?next=@evil.example` turned
  // `${origin}${next}` into a URL whose host is evil.example.
  const next             = safeNext(searchParams.get('next')) ?? '/dashboard'
  const challengeId      = searchParams.get('challenge')
  // URLSearchParams has already decoded this once; decoding again threw a
  // URIError (a 500) for any name containing a literal '%'.
  const nameParam        = searchParams.get('name')
  const error            = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Surface Supabase auth errors back to login page
  if (error) {
    const message = errorDescription ?? error
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    // If this came from challenge registration → create Profile + Participant
    if (challengeId && sessionData.user) {
      const user     = sessionData.user
      const fullName = nameParam ?? (user.user_metadata?.full_name as string | undefined) ?? ''
      try {
        await enrollAfterAuth(user.id, user.email ?? '', fullName, challengeId)
      } catch (e) {
        // A refusal (closed, full, private) has a reason worth showing; anything
        // else means enrolment genuinely did not happen. Either way, send them
        // back to the challenge with something to act on rather than to a
        // welcome page for a place they do not have.
        const message = e instanceof EnrollmentRefusedError
          ? e.message
          : 'We signed you in but could not complete your registration. Please try again.'
        if (!(e instanceof EnrollmentRefusedError)) {
          console.error('[auth/callback] enrolment failed', { challengeId, userId: user.id, error: e })
        }
        return NextResponse.redirect(
          `${origin}${next.replace(/\/welcome$/, '')}?error=` + encodeURIComponent(message)
        )
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
