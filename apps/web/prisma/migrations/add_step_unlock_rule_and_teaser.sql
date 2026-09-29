-- Two fields the day builder's settings panel needs, and one it does not get.
--
-- The builder design asks for four settings that had nowhere to be stored:
-- an unlock rule, a "tomorrow teaser", a day image, and live-session / offer
-- blocks. Three of those are handled here. The fourth is deliberately absent.
--
-- ── unlock_rule ─────────────────────────────────────────────────────────────
--
-- Until now a step's unlock time was derived entirely from the challenge mode
-- plus `order`, with `available_at` as an override. That works, but it leaves
-- the creator guessing which rule is in force for the day in front of them.
-- Storing the rule makes it answerable, and keeps the existing behaviour as
-- the default so nothing changes for steps already in the table.
--
-- ── tomorrow_teaser ─────────────────────────────────────────────────────────
--
-- One line shown at the end of a day, naming what comes next. It is the
-- cheapest retention device a challenge has, and the reason the field exists
-- in the design at all.
--
-- ── What is NOT here: day_image ─────────────────────────────────────────────
--
-- The design shows an image upload. `lib/storage` throws by design because no
-- storage provider has been chosen yet (OD-02 says Cloudflare R2; the standing
-- recommendation is Supabase Storage, since Supabase is already in the stack).
-- Adding a `day_image_url` column now would produce a control that accepts a
-- file and drops it. The column lands with the provider, not before.
--
-- ── What is NOT here: LIVE_SESSION / OFFER_CTA block types ──────────────────
--
-- The design draws live sessions and offers as blocks inside a day. In this
-- schema they are first-class models with their own screens (`LiveSession`,
-- `Offer`), which is a better design than duplicating them per day — but it
-- means "add a live session block" is a product change, not a reskin. Left for
-- a decision rather than guessed at.

ALTER TABLE challenge_steps
  ADD COLUMN IF NOT EXISTS unlock_rule      TEXT,
  ADD COLUMN IF NOT EXISTS tomorrow_teaser  TEXT;

COMMENT ON COLUMN challenge_steps.unlock_rule IS
  'scheduled_date | after_previous | immediately. NULL keeps the derived behaviour.';

COMMENT ON COLUMN challenge_steps.tomorrow_teaser IS
  'One line shown at the end of this day, naming what comes next.';
