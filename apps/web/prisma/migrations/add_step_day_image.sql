-- The day image the builder's settings panel has been asking for.
--
-- Left out of add_step_unlock_rule_and_teaser.sql on purpose: at that point
-- `lib/storage` threw, no provider had been chosen, and a column with no way
-- to fill it is just a column. Storage runs on Supabase now, so the control
-- can be real, and it needs somewhere to put the URL.
--
-- The value is a public URL rather than a storage key. These images are shown
-- on days that participants open and on pages that are open to the world, so
-- they live in the public bucket and have a stable address; storing the key
-- would mean resolving it on every render for no benefit. Submissions are the
-- opposite case and are handled the opposite way — see lib/storage.

ALTER TABLE challenge_steps
  ADD COLUMN IF NOT EXISTS day_image_url TEXT;

COMMENT ON COLUMN challenge_steps.day_image_url IS
  'Public URL of the day''s image, in the public-content bucket.';
