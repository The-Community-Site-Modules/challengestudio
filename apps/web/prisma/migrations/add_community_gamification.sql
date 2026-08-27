-- Milestone 7: community and gamification.
--
-- points_events is append-only with a unique idempotency_key, per Build Plan
-- data rule 2: progress is derived from the ledger rather than mutated in
-- place, so it stays auditable and can be recalculated. Awarding the same
-- action twice is refused by the database rather than by caller discipline.
--
-- Moderation hides rather than deletes, so "who removed this and when" stays
-- answerable.

CREATE TABLE IF NOT EXISTS "feed_posts" (
  "id"             TEXT PRIMARY KEY,
  "challenge_id"   TEXT NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "step_id"        TEXT REFERENCES "challenge_steps"("id") ON DELETE SET NULL,
  "body"           TEXT NOT NULL,
  "is_hidden"      BOOLEAN NOT NULL DEFAULT false,
  "hidden_by_id"   TEXT,
  "hidden_at"      TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "feed_posts_challenge_created_idx"
  ON "feed_posts"("challenge_id", "created_at");

CREATE TABLE IF NOT EXISTS "feed_comments" (
  "id"             TEXT PRIMARY KEY,
  "post_id"        TEXT NOT NULL REFERENCES "feed_posts"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "body"           TEXT NOT NULL,
  "is_hidden"      BOOLEAN NOT NULL DEFAULT false,
  "hidden_by_id"   TEXT,
  "hidden_at"      TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "feed_comments_post_created_idx"
  ON "feed_comments"("post_id", "created_at");

-- The unique constraint is what makes reacting idempotent: a second click on
-- the same emoji toggles it off rather than stacking another row.
CREATE TABLE IF NOT EXISTS "reactions" (
  "id"             TEXT PRIMARY KEY,
  "post_id"        TEXT NOT NULL REFERENCES "feed_posts"("id") ON DELETE CASCADE,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "emoji"          TEXT NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reactions_post_participant_emoji_key" UNIQUE ("post_id", "participant_id", "emoji")
);

CREATE TABLE IF NOT EXISTS "points_events" (
  "id"              TEXT PRIMARY KEY,
  "workspace_id"    TEXT NOT NULL,
  "challenge_id"    TEXT NOT NULL,
  "participant_id"  TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "action"          TEXT NOT NULL,
  "points"          INTEGER NOT NULL,
  "source_id"       TEXT,
  "idempotency_key" TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "points_events_idempotency_key_key" UNIQUE ("idempotency_key")
);
CREATE INDEX IF NOT EXISTS "points_events_challenge_participant_idx"
  ON "points_events"("challenge_id", "participant_id");

-- Badge definitions live in code (lib/gamification/badges); only the award is
-- a row, so there is no seed step that can drift from what the code checks.
CREATE TABLE IF NOT EXISTS "badge_awards" (
  "id"             TEXT PRIMARY KEY,
  "challenge_id"   TEXT NOT NULL,
  "participant_id" TEXT NOT NULL REFERENCES "participants"("id") ON DELETE CASCADE,
  "badge_key"      TEXT NOT NULL,
  "awarded_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "badge_awards_participant_badge_key" UNIQUE ("participant_id", "badge_key")
);
