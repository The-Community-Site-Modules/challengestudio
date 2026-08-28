-- Milestone 9: live sessions and the offer.
--
-- join_url is a column like any other, but §16 requires it be protected from
-- public discovery on a private challenge. That is enforced in the queries —
-- it is selected only for enrolled participants — rather than by the schema.
--
-- offer_clicks is an event table rather than a counter on offers, for the same
-- reason points_events is: PRD §8.1 asks creators to monitor offer clicks, and
-- a row per click stays auditable and recalculable.

CREATE TABLE IF NOT EXISTS "live_sessions" (
  "id"               TEXT PRIMARY KEY,
  "challenge_id"     TEXT NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "starts_at"        TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER,
  "host_name"        TEXT,
  "join_url"         TEXT,
  "replay_url"       TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "live_sessions_challenge_starts_idx"
  ON "live_sessions"("challenge_id", "starts_at");

CREATE TABLE IF NOT EXISTS "offers" (
  "id"           TEXT PRIMARY KEY,
  "challenge_id" TEXT NOT NULL UNIQUE REFERENCES "challenges"("id") ON DELETE CASCADE,
  "enabled"      BOOLEAN NOT NULL DEFAULT false,
  "headline"     TEXT NOT NULL,
  "body"         TEXT,
  "cta_label"    TEXT NOT NULL DEFAULT 'Get started',
  "cta_url"      TEXT NOT NULL,
  "bonuses"      JSONB,
  "faq"          JSONB,
  "closes_at"    TIMESTAMP(3),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "offer_clicks" (
  "id"             TEXT PRIMARY KEY,
  "offer_id"       TEXT NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
  "participant_id" TEXT,
  "clicked_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "offer_clicks_offer_clicked_idx"
  ON "offer_clicks"("offer_id", "clicked_at");
