-- Migration: add timezone column to workspaces table
-- Run in Supabase SQL Editor

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- Update migration tracking
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manually_applied', NOW(), '20260812230000_add_workspace_timezone', 1)
ON CONFLICT DO NOTHING;
