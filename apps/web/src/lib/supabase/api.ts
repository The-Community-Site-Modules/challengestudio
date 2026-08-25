/**
 * Supabase auth helpers for Next.js API Route Handlers.
 *
 * Uses @supabase/server's createSupabaseContext for request-level
 * auth verification in Route Handlers (app/api/**).
 *
 * Usage:
 *   export async function GET(req: Request) {
 *     const { user, supabase, error } = await requireUser(req)
 *     if (error) return error
 *     // user is guaranteed non-null here
 *   }
 */

import { createSupabaseContext } from '@supabase/server'

type AuthResult =
  | { user: NonNullable<Awaited<ReturnType<typeof createSupabaseContext>>['data']>['userClaims']; supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseContext>>['data']>['supabase']; supabaseAdmin: NonNullable<Awaited<ReturnType<typeof createSupabaseContext>>['data']>['supabaseAdmin']; error: null }
  | { user: null; supabase: null; supabaseAdmin: null; error: Response }

/**
 * Require an authenticated user for a Route Handler.
 * Returns { user, supabase, supabaseAdmin } on success,
 * or { error: Response } with a 401 JSON response on failure.
 */
export async function requireUser(req: Request): Promise<AuthResult> {
  const { data: ctx, error } = await createSupabaseContext(req, {
    auth: 'user',
  })

  if (error || !ctx) {
    return {
      user: null,
      supabase: null,
      supabaseAdmin: null,
      error: Response.json(
        { message: error?.message ?? 'Unauthorized', code: error?.code ?? 'unauthorized' },
        { status: error?.status ?? 401 }
      ),
    }
  }

  return {
    user: ctx.userClaims,
    supabase: ctx.supabase,
    supabaseAdmin: ctx.supabaseAdmin,
    error: null,
  }
}

/**
 * Allow requests authenticated with the publishable key
 * (e.g. public read endpoints, webhooks from trusted clients).
 */
export async function requirePublishableKey(req: Request): Promise<AuthResult> {
  const { data: ctx, error } = await createSupabaseContext(req, {
    auth: 'publishable',
  })

  if (error || !ctx) {
    return {
      user: null,
      supabase: null,
      supabaseAdmin: null,
      error: Response.json(
        { message: error?.message ?? 'Forbidden', code: error?.code ?? 'forbidden' },
        { status: error?.status ?? 403 }
      ),
    }
  }

  return {
    user: ctx.userClaims,
    supabase: ctx.supabase,
    supabaseAdmin: ctx.supabaseAdmin,
    error: null,
  }
}
