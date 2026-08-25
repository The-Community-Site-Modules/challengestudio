/**
 * Next.js Middleware — Session refresh + Route protection
 *
 * RESPONSIBILITIES:
 * 1. Refresh Supabase auth token on every request (keeps session alive)
 * 2. Redirect unauthenticated users away from protected routes → /auth/login
 * 3. Redirect authenticated users away from auth pages → /dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require a logged-in user
const PROTECTED_PREFIXES = ['/dashboard', '/ws/', '/account/', '/admin']

// Platform-owner tooling. Spans every tenant, so workspace membership cannot
// grant it — access is an allow-list of emails in PLATFORM_ADMIN_EMAIL.
// An unset variable denies everyone; the allow-list fails closed.
const PLATFORM_ADMIN_PREFIX = '/admin'

function isPlatformAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.PLATFORM_ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.length > 0 && allowed.includes(email.trim().toLowerCase())
}

// Auth pages — authenticated users shouldn't see these
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Build the response object that Supabase SSR can attach cookies to
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() — this refreshes the session token
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated → redirect to login, preserving the intended destination
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('message', 'Please sign in to continue.')
    return NextResponse.redirect(loginUrl)
  }

  // Signed in but not a platform admin → /admin is not theirs to see.
  // Each /admin page also calls requirePlatformAdmin(); this is the outer gate.
  if (pathname.startsWith(PLATFORM_ADMIN_PREFIX) && user && !isPlatformAdminEmail(user.email)) {
    const url = new URL('/dashboard', request.url)
    url.searchParams.set('error', 'You do not have access to that area.')
    return NextResponse.redirect(url)
  }

  // Authenticated → skip auth pages, go straight to dashboard
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
