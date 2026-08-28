/**
 * Next.js Middleware — Session refresh + Route protection
 *
 * RESPONSIBILITIES:
 * 1. Refresh Supabase auth token on every request (keeps session alive)
 * 2. Redirect unauthenticated users away from protected routes → /auth/login
 * 3. Redirect authenticated users away from auth pages → /dashboard
 * 4. Attach the Content-Security-Policy
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require a logged-in user
// Note the missing trailing slashes: '/account/' would leave '/account'
// itself ungated, and a prefix list is only as good as its edges.
const PROTECTED_PREFIXES = ['/dashboard', '/ws/', '/account', '/admin']

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


/**
 * Content-Security-Policy (PRD §22, milestone 11).
 *
 * next.config.ts sets the headers that never change; this one is here because
 * it differs between development and production.
 *
 * **Why there is no nonce.** The first version of this used a per-request
 * nonce with 'strict-dynamic', which is the stronger policy and the one Next
 * documents. Building for production and running the header spec against it
 * showed why that cannot work here: ten routes — the login and sign-up pages
 * among them — are statically prerendered, so their HTML is generated once at
 * build time and can never carry a nonce minted per request. With
 * 'strict-dynamic' the browser then refused every script on those pages and
 * they silently failed to hydrate: a login form that renders and does nothing.
 *
 * A nonce would mean forcing every page to render dynamically. That is a real
 * cost paid for a policy whose remaining benefit — over 'self' — is guarding
 * against injected inline script, which React's escaping already handles.
 *
 * So: 'self' plus 'unsafe-inline', and the directives that do the heavy
 * lifting kept strict. object-src, base-uri, form-action and frame-ancestors
 * are what stop plugin injection, base-tag hijacking, form exfiltration and
 * clickjacking, and none of them is weakened here.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV === 'development'

  return [
    "default-src 'self'",
    // 'unsafe-inline' covers Next's own bootstrap and RSC payload scripts on
    // statically rendered pages. 'unsafe-eval' is Turbopack's hot reload and
    // is development-only.
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    // Tailwind is fine, but Next and Radix both set inline style attributes,
    // which no nonce can cover.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Supabase serves avatars and anything storage-backed.
    "img-src 'self' data: blob: https:",
    // Supabase auth and realtime. Everything else is same-origin.
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} wss://*.supabase.co${dev ? ' ws://localhost:*' : ''}`,
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com",
    "media-src 'self' https:",
    // No plugins, no <base> rewriting, no posting this site's forms elsewhere.
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Belt and braces with X-Frame-Options in next.config.ts, which older
    // browsers understand and this directive replaces.
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const policy = contentSecurityPolicy()

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
    // Keep where they were going. Without this, signing in always lands on the
    // dashboard and a shared link to a specific page is lost at the door.
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return withPolicy(NextResponse.redirect(loginUrl), policy)
  }

  // Signed in but not a platform admin → /admin is not theirs to see.
  // Each /admin page also calls requirePlatformAdmin(); this is the outer gate.
  if (pathname.startsWith(PLATFORM_ADMIN_PREFIX) && user && !isPlatformAdminEmail(user.email)) {
    const url = new URL('/dashboard', request.url)
    url.searchParams.set('error', 'You do not have access to that area.')
    return withPolicy(NextResponse.redirect(url), policy)
  }

  // Authenticated → skip auth pages, go straight to dashboard
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  if (isAuthRoute && user) {
    return withPolicy(NextResponse.redirect(new URL('/dashboard', request.url)), policy)
  }

  return withPolicy(response, policy)
}

/** Every path out of the middleware carries the policy, redirects included. */
function withPolicy(response: NextResponse, policy: string): NextResponse {
  response.headers.set('Content-Security-Policy', policy)
  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
