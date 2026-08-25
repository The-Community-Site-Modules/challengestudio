-- Migration: add workspace_invitations table
-- Run in Supabase SQL Editor

CREATE TABLE "workspace_invitations" (
    "id"            TEXT        NOT NULL,
    "workspace_id"  TEXT        NOT NULL,
    "email"         TEXT        NOT NULL,
    "role"          "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "invited_by_id" TEXT        NOT NULL,
    "expires_at"    TIMESTAMP(3) NOT NULL,
    "accepted_at"   TIMESTAMP(3),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_invitations_token_key"               ON "workspace_invitations"("token");
CREATE UNIQUE INDEX "workspace_invitations_workspace_id_email_key"  ON "workspace_invitations"("workspace_id", "email");

ALTER TABLE "workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_id_fkey"
    FOREIGN KEY ("invited_by_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspace admins/owners can see invitations for their workspace
CREATE POLICY "workspace_invitations: admin read" ON workspace_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
-- Workspace admins/owners can create invitations
CREATE POLICY "workspace_invitations: admin insert" ON workspace_invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
-- Anyone can read an invitation by token (for the accept flow — no auth required)
CREATE POLICY "workspace_invitations: token read" ON workspace_invitations FOR SELECT USING (true);

-- Workspace admins can delete (cancel) invitations
CREATE POLICY "workspace_invitations: admin delete" ON workspace_invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_invitations.workspace_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- Update migration tracking
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manually_applied', NOW(), '20260812220000_add_workspace_invitations', 1)
ON CONFLICT DO NOTHING;
