-- Migration: extend challenges and challenge_steps tables
-- Run in Supabase SQL Editor

-- ── challenges: new columns ───────────────────────────────────────────────────
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS "promise"               TEXT,
  ADD COLUMN IF NOT EXISTS "outcome"               TEXT,
  ADD COLUMN IF NOT EXISTS "starting_point"        TEXT,
  ADD COLUMN IF NOT EXISTS "success_definition"    TEXT,
  ADD COLUMN IF NOT EXISTS "registration_opens_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "registration_closes_at"TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "requires_approval"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "settings"              JSONB;

-- ── challenge_steps: new columns ─────────────────────────────────────────────
ALTER TABLE challenge_steps
  ADD COLUMN IF NOT EXISTS "step_type"          TEXT NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS "is_published"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "estimated_minutes"  INTEGER,
  ADD COLUMN IF NOT EXISTS "completion_method"  TEXT,
  ADD COLUMN IF NOT EXISTS "points_xp"          INTEGER;

-- ── update migration tracking ────────────────────────────────────────────────
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manually_applied', NOW(), '20260812240000_add_challenge_fields', 1)
ON CONFLICT DO NOTHING;
