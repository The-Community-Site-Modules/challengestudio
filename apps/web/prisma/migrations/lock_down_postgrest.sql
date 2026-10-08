-- Migration: close the browser's direct route into the public schema
-- Run in Supabase SQL Editor, after rls_policies.sql and every add_*.sql.
--
-- WHY. The browser holds the publishable key and, once signed in, a user JWT.
-- With those it can call PostgREST (/rest/v1/...) directly, where only RLS
-- stands between it and the tables. Several policies allowed writes the app
-- itself forbids:
--
--   participants: own update  — a PENDING participant could set their own
--                               status to REGISTERED (approve themselves) or
--                               COMPLETED.
--   participants: self insert — anyone could join any challenge, private,
--                               draft or full, skipping every server gate.
--   submissions:  own update  — a participant could write `feedback` and
--                               `reviewed_by` (forged reviews) or clear
--                               `is_private`.
--   profiles:     own update  — a user could set profiles.email to any
--                               address. That column is what invitations and
--                               the "add existing account" path match on.
--
-- WHAT. The application never uses PostgREST: every read and write goes
-- through Prisma on the server, connected as the table owner, which these
-- grants do not touch. Supabase Auth, Storage and the auth triggers (SECURITY
-- DEFINER) are unaffected as well. So the browser roles need no access to the
-- public schema at all, and revoking it removes the whole class of bug rather
-- than patching policy by policy. The RLS policies stay as a second layer.
--
-- If a future feature needs browser access to a table, GRANT exactly that
-- (table, columns, verb) and write a policy for it — do not re-grant ALL.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Tables created later by the owner start closed too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Verify: both should return zero rows.
--   SELECT table_name, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
