-- Migration: challenge slugs unique across the whole platform
-- Run in Supabase SQL Editor.
--
-- The public page is /c/<slug> and carries no workspace, but slugs were only
-- unique per workspace. Two workspaces could both own "30-day-fitness", and
-- every /c/ route resolved the slug with findFirst — sending one workspace's
-- participants into the other's challenge.
--
-- Existing duplicates are renamed first (all but the oldest get "-<6 chars of
-- id>"), otherwise the index cannot be created. Renamed challenges change URL;
-- check the NOTICE output and tell those creators.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, slug
    FROM (
      SELECT id, slug,
             ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
      FROM challenges
    ) ranked
    WHERE rn > 1
  LOOP
    UPDATE challenges
       SET slug = r.slug || '-' || substr(r.id, length(r.id) - 5)
     WHERE id = r.id;
    RAISE NOTICE 'Renamed duplicate challenge slug % (id %)', r.slug, r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "challenges_slug_key" ON "challenges"("slug");

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manually_applied', NOW(), '20261008000000_add_challenge_slug_unique', 1)
ON CONFLICT DO NOTHING;
