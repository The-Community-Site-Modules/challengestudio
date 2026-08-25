-- ═══════════════════════════════════════════════════════════════════════
-- AUTH TRIGGER — Auto-create profile on signup
-- Run once in Supabase SQL Editor (Project → SQL Editor → New query)
-- Safe to re-run: the function is CREATE OR REPLACE and the trigger is
-- dropped before being recreated.
-- ═══════════════════════════════════════════════════════════════════════
--
-- When a new user signs up via Supabase Auth, this trigger creates the matching
-- row in public.profiles. Every tenant table has a foreign key to profiles, so
-- without this row the user can authenticate but cannot create a workspace —
-- the failure surfaces later as workspaces_owner_id_fkey rather than at signup.
--
-- The trigger runs inside the auth.users INSERT transaction. Anything it raises
-- aborts that insert, which means a bug here does not corrupt a profile — it
-- stops the person signing up at all. Two guards follow from that:
--
--   1. profiles.email is NOT NULL and UNIQUE, and Supabase allows an account
--      with no email (phone sign-in). COALESCE to a stable placeholder rather
--      than letting a NULL violate the constraint.
--
--   2. EXCEPTION WHEN OTHERS swallows anything else — a duplicate email from a
--      recycled address, say. Signup proceeds; getCurrentUser() in
--      src/lib/auth/session.ts creates the row on first request instead. Losing
--      the row here is recoverable, blocking signup is not.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, NEW.id::text || '@no-email.local'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup. The application self-heals on the next request.
  RAISE WARNING 'handle_new_user could not create a profile for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running this script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fire after every new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill ─────────────────────────────────────────────────────────────
-- Accounts created before this trigger existed have no profiles row. Give
-- them one so they are not stuck behind the same foreign key.

INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT
  u.id::text,
  COALESCE(u.email, u.id::text || '@no-email.local'),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.raw_user_meta_data->>'avatar_url',
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id::text
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;

-- Verify:
--   SELECT count(*) FROM auth.users;      -- should equal
--   SELECT count(*) FROM public.profiles; -- this
