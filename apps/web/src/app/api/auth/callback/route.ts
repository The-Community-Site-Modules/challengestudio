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
import { enrollAfterAuthAction }     from '@/app/c/[challengeSlug]/actions'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code             = searchParams.get('code')
  const next             = searchParams.get('next') ?? '/dashboard'
  const challengeId      = searchParams.get('challenge')
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
      const fullName = nameParam ? decodeURIComponent(nameParam) : (user.user_metadata?.full_name ?? '')
      try {
        await enrollAfterAuthAction(user.id, user.email ?? '', fullName, challengeId)
      } catch {
        // Non-fatal — profile/participant may already exist (idempotent upserts)
        // Continue to redirect even if this fails
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code — redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
