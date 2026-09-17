/**
 * The facts both legal documents depend on, in one place.
 *
 * ── What is confirmed and what is not ───────────────────────────────────────
 *
 * The addresses below are on `mychallengestudio.com`, the domain this product
 * actually runs on and which is verified for sending in Resend. They were
 * previously on `challengestudio.app` — a domain nobody here owns, which is
 * worse than no contact address at all: a privacy page that invites a data
 * request and sends it to a stranger's mail server.
 *
 * **The two inboxes still have to exist.** Naming an address on a privacy page
 * is an undertaking to read it. Forwarding both to one real mailbox is fine;
 * leaving them undeliverable is not.
 *
 * `jurisdiction` is still unconfirmed. It is a legal fact about the company,
 * not a product decision, and a governing-law clause naming the wrong state is
 * worse than a vague one. Confirm it against the LLC's registration.
 *
 * Everything else — what data is collected, which processors touch it, where it
 * is hosted, what cookies are set — was read out of the schema, the middleware
 * and the env file, so it is accurate as of the date below.
 *
 * Neither document has been reviewed by a lawyer. They are written to be
 * truthful and specific rather than comprehensive, which is the right order to
 * do it in but not a substitute for review.
 */

export const LEGAL = {
  company: 'Smartstack Platforms LLC',
  product: 'Challenge Studio',

  /** Must be a real, monitored inbox — see the note above. */
  contactEmail: 'legal@mychallengestudio.com',
  privacyEmail: 'privacy@mychallengestudio.com',

  /** CONFIRM. The state the LLC is registered in. */
  jurisdiction: 'the State of Delaware, United States',

  /** Where the database and authentication actually live. */
  hostingRegion: 'AWS us-west-2 (Oregon, United States)',

  effectiveDate: '16 September 2026',
} as const
