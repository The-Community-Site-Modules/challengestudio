-- Workspace branding: the fields the Branding page edits.
--
-- Applied by hand in the Supabase SQL editor on 2026-10-23, before any code
-- that reads these columns was deployed. Keep that order for anything like
-- this: code that selects a column the database does not have breaks the page
-- that selects it (see add_challenge_fields.sql).
--
-- Every column is nullable and nothing is backfilled, so a workspace that has
-- never opened Branding looks exactly as it did before.

alter table public.workspaces
  add column if not exists favicon_url   text,
  add column if not exists primary_color text,
  add column if not exists accent_color  text,
  add column if not exists sender_name   text,
  add column if not exists support_email text,
  add column if not exists privacy_url   text,
  add column if not exists terms_url     text;

-- Colours go straight into a page's styles, so only a real hex value is
-- allowed. The action validates too; this is the backstop for anything that
-- reaches the table another way.
alter table public.workspaces
  add constraint workspaces_primary_color_hex
    check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$'),
  add constraint workspaces_accent_color_hex
    check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$');

-- To undo:
--   alter table public.workspaces
--     drop column if exists favicon_url,   drop column if exists primary_color,
--     drop column if exists accent_color,  drop column if exists sender_name,
--     drop column if exists support_email, drop column if exists privacy_url,
--     drop column if exists terms_url;
