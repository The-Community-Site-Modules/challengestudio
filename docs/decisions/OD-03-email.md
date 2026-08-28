# OD-03: Email Provider

**Status:** 🟡 Resend is what the code calls; final sign-off and an API key
are still outstanding. Updated 2026-08-29.

> **Where this actually stands.** `lib/email` is provider-abstracted exactly
> as the plan asked, and `message_deliveries` is a provider-agnostic log.
> Resend is the only adapter written. Without `RESEND_API_KEY` every message
> is logged and none is sent — deliberately, so a missing key is visible in
> the delivery log rather than silent.
>
> **The trap:** Resend accepts an API key without a verified sending domain
> and then delivers only to the account owner. A test that "works" for you and
> reaches nobody else is the usual first symptom. Verify the domain before
> believing any send.
**Blocking:** Milestone 13

## Recommendation: Resend

**Why Resend:**
- PRD §32 identifies Resend as the likely option
- Developer-friendly API, React Email integration built-in
- Good deliverability, competitive pricing
- Abstraction layer in `lib/email/` means switching costs are low

## Action required
Reply with: **Resend** or specify alternative.
Once confirmed, provide: API Key, verified sender domain/address.
