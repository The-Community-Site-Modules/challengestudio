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
import { knowsPassword, offersPassword, setPasswordPath } from '@/lib/auth/password'
import { isEmailOtpType, linkParams } from '@/lib/auth/email-link'
import type { EmailOtpType }        from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  // Our parameters may sit inside the template's `redirect_to` — see
  // lib/auth/email-link.
  const searchParams = linkParams(new URL(request.url).searchParams)

  const code             = searchParams.get('code')
  const tokenHash        = searchParams.get('token_hash')
  const otpType          = searchParams.get('type')
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

  // A token hash (the current email templates) verifies in any browser; a code
  // (older emails) only in the one holding its PKCE verifier cookie.
  const byToken = !!tokenHash && isEmailOtpType(otpType)

  if (code || byToken) {
    const supabase = await createClient()
    const { data: sessionData, error: exchangeError } = byToken
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType as EmailOtpType })
      : await supabase.auth.exchangeCodeForSession(code!)

    if (exchangeError) {
      // The commonest failure is a link opened in a different browser or on a
      // different device from the one that asked for it: the PKCE verifier
      // cookie lives only in the original browser. Supabase's message for that
      // means nothing to a participant, and the product login page was the
      // wrong place to send someone who registered for a challenge.
      const verifierMissing =
        exchangeError.code === 'bad_code_verifier' || /code.verifier/i.test(exchangeError.message)
      const challengePath = /^\/c\/[^/]+/.exec(next)?.[0]
      // A token link fails only when it is expired or already used — say so
      // rather than Supabase's "otp_expired".
      const spent = 'That link has expired or has already been used.'

      // A registration link (it carries ?challenge) goes back to the
      // registration form. The challenge's sign-in page only signs people in,
      // so a new link asked for there never enrolled them: a registrant who
      // opened their email on their phone ended up with an account and no
      // place in the challenge. A fresh link from the form enrols.
      if (challengeId && challengePath) {
        const message = byToken
          ? `${spent} Register again below to get a new one.`
          : verifierMissing
            ? 'That link has to be opened in the same browser you registered in. Register again below, then open the new link in this browser.'
            : exchangeError.message
        return NextResponse.redirect(`${origin}${challengePath}?error=${encodeURIComponent(message)}`)
      }

      const message = byToken
        ? `${spent} Ask for a new one here.`
        : verifierMissing
          ? 'That link has to be opened in the same browser you used to request it. Ask for a new link here and open it in this browser.'
          : exchangeError.message
      const signIn = challengePath ? `${challengePath}/access` : '/auth/login'
      return NextResponse.redirect(`${origin}${signIn}?error=${encodeURIComponent(message)}`)
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

    // A link sign-in by someone who has never chosen a password: offer to
    // create one before going on. Without it, the same person opening a later
    // link on another device lands on a sign-in page asking for a password they
    // never had. The page has "Skip for now", so this offers rather than
    // blocks. Decided from the session's own metadata — see lib/auth/password
    // for why the database cannot answer this.
    const signedIn = sessionData.user
    if (signedIn && offersPassword(next) && !knowsPassword(signedIn)) {
      return NextResponse.redirect(`${origin}${setPasswordPath(next)}`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
