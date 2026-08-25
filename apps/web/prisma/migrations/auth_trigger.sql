-- ═══════════════════════════════════════════════════════════════════════
-- AUTH TRIGGER — Auto-create profile on signup
-- Run once in Supabase SQL Editor AFTER rls_policies.sql
-- ═══════════════════════════════════════════════════════════════════════
--
-- When a new user signs up via Supabase Auth, this trigger automatically
-- creates a matching row in the public.profiles table.
-- This keeps auth.users and public.profiles in sync without any app code.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
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
