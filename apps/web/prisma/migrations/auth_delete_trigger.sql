-- ═══════════════════════════════════════════════════════════════════════
-- AUTH DELETE TRIGGER — remove the profile when an account is deleted
-- Run once in Supabase SQL Editor, after auth_trigger.sql
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════
--
-- WHY THIS IS NEEDED
--
-- public.profiles.id is TEXT and auth.users.id is UUID, so the two cannot be
-- joined by a foreign key — nothing enforces the relationship the schema
-- comment claims ("matches auth.users.id"). Deleting an account through the
-- Supabase dashboard therefore left its profiles row behind.
--
-- That leftover is not inert. profiles.email is UNIQUE, so signing up again
-- with the same address produced:
--
--     Unique constraint failed on the fields: (`email`)
--
-- — a new auth user with a new id, colliding with the old row's email. The
-- person could authenticate and then hit an error on every page load.
--
-- Deleting the profile alongside the account keeps the two tables in step and
-- removes that failure mode. src/lib/auth/session.ts still recovers from any
-- leftover rows that predate this trigger.
--
-- Note the blast radius: workspace_members and participants are ON DELETE
-- CASCADE, so removing a profile removes those too. workspaces is ON DELETE
-- RESTRICT — deleting an account that still owns a workspace will fail here,
-- which is the safe direction. Transfer ownership first.

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id::text;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Most likely workspaces_owner_id_fkey: the account still owns a workspace.
  -- Warn rather than abort, so the auth deletion is not blocked by this hook;
  -- the leftover profile is then handled by session.ts on next sign-in.
  RAISE WARNING 'handle_user_deleted could not remove profile %: %', OLD.id, SQLERRM;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deleted();

-- ── Clean up rows left behind before this trigger existed ────────────────
-- Only those with no data hanging off them. A profile that still owns a
-- workspace is left alone for a human to decide about.

DELETE FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.profile_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.participants pa WHERE pa.profile_id = p.id);

-- Verify — both should be empty:
--   SELECT p.id, p.email FROM profiles p
--     LEFT JOIN auth.users u ON u.id::text = p.id WHERE u.id IS NULL;
--   SELECT u.id, u.email FROM auth.users u
--     LEFT JOIN profiles p ON p.id = u.id::text WHERE p.id IS NULL;
