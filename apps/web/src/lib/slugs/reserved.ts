/**
 * Slugs the product needs for itself (milestone 11).
 *
 * A workspace lives at `/ws/<slug>` and a challenge at `/c/<slug>`, so a
 * challenge slugged `auth` would sit at `/c/auth` and do no harm. The danger
 * is the reverse: routes that get added later, and slugs that read as
 * something they are not.
 *
 * Two kinds of name are refused:
 *
 *   **Route names.** Every top-level segment this app already serves, plus the
 *   ones a web app conventionally grows into (`api`, `admin`, `static`,
 *   `assets`). Reserving them now costs nothing; discovering later that a
 *   customer owns `/c/api` costs a migration and a broken link.
 *
 *   **Names that impersonate.** `support`, `billing`, `security`, `official`.
 *   A challenge page at `/c/support` reads as the product's own support page,
 *   and a participant handing over details there would be right to feel
 *   deceived. This is a phishing surface, not a routing problem.
 *
 * Also refused: anything shorter than two characters, and anything that is
 * only digits — both are the shape of an id, and a slug that looks like an id
 * invites a lookup that is not scoped to a workspace.
 */

const ROUTES = [
  'account', 'admin', 'api', 'assets', 'auth', 'c', 'cdn', 'dashboard',
  'docs', 'help', 'images', 'internal', 'login', 'logout', 'new', 'onboarding',
  'preview', 'public', 'settings', 'signin', 'signup', 'static', 'status',
  'system', 'ws',
]

const IMPERSONATION = [
  'billing', 'challenge-studio', 'legal', 'official', 'payments', 'privacy',
  'root', 'security', 'support', 'team', 'terms',
]

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([...ROUTES, ...IMPERSONATION])

export interface SlugCheck {
  ok: boolean
  /** Shown to whoever typed it. Says what to do, not what a slug is for. */
  error?: string
}

/**
 * Is this slug available to a customer?
 *
 * Returns a reason rather than a boolean so the caller can say something
 * useful; the wording avoids "reserved", which invites the question "by whom"
 * and tells someone probing exactly which names are interesting.
 */
export function checkSlug(slug: string): SlugCheck {
  const value = slug.trim().toLowerCase()

  if (value.length < 2) {
    return { ok: false, error: 'That name is too short — use at least two characters.' }
  }
  if (/^\d+$/.test(value)) {
    return { ok: false, error: 'That name cannot be only numbers.' }
  }
  if (RESERVED_SLUGS.has(value)) {
    return { ok: false, error: 'That name is not available. Try another.' }
  }
  return { ok: true }
}

/**
 * A slug that is safe to use, given one that may not be.
 *
 * Used where refusing outright would be unhelpful — a challenge slug derived
 * from a title the person did not choose as a URL. `support` becomes
 * `support-2`, which is theirs and cannot be mistaken for ours.
 */
export function avoidReserved(slug: string): string {
  return checkSlug(slug).ok ? slug : `${slug}-2`
}
