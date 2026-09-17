-- notification_preferences.profile_id was created with ON UPDATE NO ACTION,
-- the only foreign key into profiles that does not cascade on update.
--
-- That matters because of one specific recovery path. When somebody
-- re-registers with an address whose profiles row was left behind by a deleted
-- account, lib/auth/session.ts moves the surviving row onto the new auth id
-- rather than deleting it — so the person gets their workspaces and
-- memberships back instead of losing them. The comment there states that every
-- foreign key into profiles is ON UPDATE CASCADE, and for four of the five it
-- is. This table arrived in Milestone 8, after that was written, and its
-- migration did not carry the clause.
--
-- The consequence was latent: the recovery only fails for a person who had
-- saved a notification preference. Nobody had, so nothing broke — the account
-- that exposed this had none, and the reclaim was blocked one layer earlier by
-- a detection bug instead.
--
-- Applied manually, like every migration in this project.

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_profile_id_fkey;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
  ON UPDATE CASCADE ON DELETE CASCADE;
