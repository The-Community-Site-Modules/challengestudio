-- Milestone 8: communications.
--
-- PRD §27: "Core transactional triggers are sent once, delivery failures are
-- observable, and unsubscribe rules are respected." All three are enforced
-- here rather than in application discipline:
--
--   sent once      → unique idempotency_key on message_deliveries
--   observable     → a failure is a row with status 'failed', not a silence
--   unsubscribe    → (profile, workspace) unique, so opting out of one
--                    workspace says nothing about any other (§15.2)

CREATE TABLE IF NOT EXISTS "message_templates" (
  "id"           TEXT PRIMARY KEY,
  "challenge_id" TEXT NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "trigger"      TEXT NOT NULL,
  "enabled"      BOOLEAN NOT NULL DEFAULT true,
  "subject"      TEXT,
  "body"         TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_templates_challenge_trigger_key" UNIQUE ("challenge_id", "trigger")
);

CREATE TABLE IF NOT EXISTS "message_deliveries" (
  "id"              TEXT PRIMARY KEY,
  "workspace_id"    TEXT NOT NULL,
  "challenge_id"    TEXT,
  "participant_id"  TEXT,
  "recipient_email" TEXT NOT NULL,
  "trigger"         TEXT NOT NULL,
  "status"          TEXT NOT NULL,
  "provider"        TEXT,
  "error"           TEXT,
  "idempotency_key" TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_deliveries_idempotency_key_key" UNIQUE ("idempotency_key")
);
CREATE INDEX IF NOT EXISTS "message_deliveries_workspace_created_idx"
  ON "message_deliveries"("workspace_id", "created_at");
CREATE INDEX IF NOT EXISTS "message_deliveries_challenge_trigger_idx"
  ON "message_deliveries"("challenge_id", "trigger");

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id"           TEXT PRIMARY KEY,
  "profile_id"   TEXT NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "workspace_id" TEXT NOT NULL,
  "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_profile_workspace_key" UNIQUE ("profile_id", "workspace_id")
);
