/**
 * The facts both legal documents depend on, in one place.
 *
 * ── Two of these need confirming before launch ──────────────────────────────
 *
 * `contactEmail` and `jurisdiction` are the only values on either page that
 * could not be established from the codebase. Everything else — what data is
 * collected, which processors touch it, where it is hosted, what cookies are
 * set — was read out of the schema, the middleware and the env file, so it is
 * accurate as of the date below.
 *
 * The jurisdiction in particular is a legal fact about the company, not a
 * product decision, and a governing-law clause naming the wrong state is
 * worse than a vague one. Confirm it.
 *
 * Neither document has been reviewed by a lawyer. They are written to be
 * truthful and specific rather than to be comprehensive, which is the right
 * order to do it in but not a substitute for review.
 */

export const LEGAL = {
  company: 'Smartstack Platforms LLC',
  product: 'Challenge Studio',

  /** CONFIRM. A personal address must not go on a public page. */
  contactEmail: 'legal@challengestudio.app',
  privacyEmail: 'privacy@challengestudio.app',

  /** CONFIRM. The state the LLC is registered in. */
  jurisdiction: 'the State of Delaware, United States',

  /** Where the database and authentication actually live. */
  hostingRegion: 'AWS us-west-2 (Oregon, United States)',

  effectiveDate: '16 September 2026',
} as const
