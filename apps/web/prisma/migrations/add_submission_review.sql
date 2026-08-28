-- Milestone 8: submission review, and the privacy flag it makes matter.
--
-- is_private was collected by the reflection block and stored inside the JSON
-- payload, where nothing could query it. That was harmless while nothing read
-- submissions; the review page is the first thing that does, so PRD §27 —
-- "private submissions cannot be accessed by unrelated participants or
-- workspaces" — needs it as a column the queries can filter on.
--
-- Backfilled from the JSON so existing private reflections stay private.

ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "is_private"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "feedback"        TEXT;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "reviewed_by_id"  TEXT;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "reviewed_at"     TIMESTAMP(3);

UPDATE "submissions"
   SET "is_private" = true
 WHERE "data"::jsonb -> 'isPrivate' = 'true'::jsonb
   AND "is_private" = false;
