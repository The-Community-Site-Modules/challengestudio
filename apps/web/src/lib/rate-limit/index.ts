// Rate limiting — Upstash Redis via @upstash/ratelimit
// Applied to: public registration forms, social actions (post, comment, react)
// PRD §22.2 — rate limits required on public registration and social actions
//
// TODO: Activate in Milestone 7 once Upstash credentials provided

export type RateLimitAction =
  | 'public_registration'   // Public challenge registration form
  | 'social_post'           // Feed post
  | 'social_comment'        // Comment on submission/feed
  | 'social_reaction'       // Reaction (emoji)
  | 'auth_attempt'          // Login/signup attempts

// Sliding window limits per action type (requests per window)
export const RATE_LIMITS: Record<RateLimitAction, { requests: number; windowSeconds: number }> = {
  public_registration: { requests: 5,   windowSeconds: 3600 }, // 5 per hour per IP
  social_post:         { requests: 20,  windowSeconds: 3600 }, // 20 per hour per user
  social_comment:      { requests: 50,  windowSeconds: 3600 }, // 50 per hour per user
  social_reaction:     { requests: 100, windowSeconds: 3600 }, // 100 per hour per user
  auth_attempt:        { requests: 10,  windowSeconds: 900  }, // 10 per 15 min per IP
}

// Placeholder — implemented in Milestone 7
export async function checkRateLimit(
  _action: RateLimitAction,
  _identifier: string // IP address or user ID
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // Return allowed in development until Redis is configured
  return { allowed: true, remaining: 999, resetAt: new Date() }
}
