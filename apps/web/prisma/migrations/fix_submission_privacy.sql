-- Migration: mark private reflections private
-- Run in Supabase SQL Editor, after add_submission_review.sql.
--
-- add_submission_review.sql backfilled is_private from a top-level
-- data.isPrivate key. No block ever writes one: the day page stores each
-- block's answer under its block id, and a reflection is
-- { "<blockId>": { "text": "...", "isPrivate": true } }. So the backfill, and
-- every submission since, recorded private reflections as visible.
--
-- The app now reads the nested flag (src/lib/submissions/payload.ts) and the
-- review pages also check the payload, so this is for the column's sake: it is
-- what any query, export or future screen will filter on.

UPDATE "submissions" s
   SET "is_private" = true
 WHERE s."is_private" = false
   AND jsonb_typeof(s."data") = 'object'
   AND EXISTS (
     SELECT 1
       FROM jsonb_each(s."data") AS entry(key, value)
      WHERE jsonb_typeof(entry.value) = 'object'
        AND entry.value -> 'isPrivate' = 'true'::jsonb
   );
