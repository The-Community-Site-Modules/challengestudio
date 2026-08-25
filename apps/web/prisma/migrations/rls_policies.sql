-- ═══════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Challenge Studio
-- Run once in Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════

-- Enable RLS on every table
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions         ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────
-- Users can only read/update their own profile
CREATE POLICY "profiles: own read"   ON profiles FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "profiles: own insert" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

-- ── workspaces ───────────────────────────────────────────────────────────
-- Members can read workspaces they belong to
CREATE POLICY "workspaces: member read" ON workspaces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.profile_id = auth.uid()::text
  )
);
-- Only owners can update/delete
CREATE POLICY "workspaces: owner update" ON workspaces FOR UPDATE USING (owner_id = auth.uid()::text);
CREATE POLICY "workspaces: owner delete" ON workspaces FOR DELETE USING (owner_id = auth.uid()::text);
-- Any authenticated user can create a workspace
CREATE POLICY "workspaces: auth insert" ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── workspace_members ────────────────────────────────────────────────────
-- Members can see other members of their workspaces
CREATE POLICY "workspace_members: member read" ON workspace_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.profile_id = auth.uid()::text
  )
);
-- Only workspace owners/admins can add members
CREATE POLICY "workspace_members: admin insert" ON workspace_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.profile_id = auth.uid()::text
      AND wm2.role IN ('OWNER', 'ADMIN')
  )
);
-- Only workspace owners/admins can remove members (or members can remove themselves)
CREATE POLICY "workspace_members: admin delete" ON workspace_members FOR DELETE USING (
  profile_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM workspace_members wm2
    WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.profile_id = auth.uid()::text
      AND wm2.role IN ('OWNER', 'ADMIN')
  )
);

-- ── challenges ───────────────────────────────────────────────────────────
-- Public challenges are readable by anyone (registered or not)
CREATE POLICY "challenges: public read" ON challenges FOR SELECT USING (
  is_public = true
  OR EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = challenges.workspace_id
      AND workspace_members.profile_id = auth.uid()::text
  )
);
-- Only workspace members with OWNER/ADMIN role can create/edit/delete challenges
CREATE POLICY "challenges: admin write" ON challenges FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = challenges.workspace_id
      AND workspace_members.profile_id = auth.uid()::text
      AND workspace_members.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "challenges: admin update" ON challenges FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = challenges.workspace_id
      AND workspace_members.profile_id = auth.uid()::text
      AND workspace_members.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "challenges: admin delete" ON challenges FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = challenges.workspace_id
      AND workspace_members.profile_id = auth.uid()::text
      AND workspace_members.role IN ('OWNER', 'ADMIN')
  )
);

-- ── challenge_steps ──────────────────────────────────────────────────────
-- Readable if the parent challenge is readable
CREATE POLICY "challenge_steps: read" ON challenge_steps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM challenges
    WHERE challenges.id = challenge_steps.challenge_id
      AND (
        challenges.is_public = true
        OR EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_members.workspace_id = challenges.workspace_id
            AND workspace_members.profile_id = auth.uid()::text
        )
      )
  )
);
-- Admin write (same workspace admin check via challenge)
CREATE POLICY "challenge_steps: admin write" ON challenge_steps FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM challenges c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = challenge_steps.challenge_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "challenge_steps: admin update" ON challenge_steps FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM challenges c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = challenge_steps.challenge_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "challenge_steps: admin delete" ON challenge_steps FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM challenges c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = challenge_steps.challenge_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- ── content_blocks ───────────────────────────────────────────────────────
-- Same access rules as challenge_steps (read if step readable, write if admin)
CREATE POLICY "content_blocks: read" ON content_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM challenge_steps cs
    JOIN challenges c ON c.id = cs.challenge_id
    WHERE cs.id = content_blocks.step_id
      AND (
        c.is_public = true
        OR EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = c.workspace_id
            AND wm.profile_id = auth.uid()::text
        )
      )
  )
);
CREATE POLICY "content_blocks: admin write" ON content_blocks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM challenge_steps cs
    JOIN challenges c ON c.id = cs.challenge_id
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE cs.id = content_blocks.step_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "content_blocks: admin update" ON content_blocks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM challenge_steps cs
    JOIN challenges c ON c.id = cs.challenge_id
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE cs.id = content_blocks.step_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
CREATE POLICY "content_blocks: admin delete" ON content_blocks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM challenge_steps cs
    JOIN challenges c ON c.id = cs.challenge_id
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE cs.id = content_blocks.step_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- ── participants ──────────────────────────────────────────────────────────
-- Participants can read their own record; workspace admins can read all
CREATE POLICY "participants: own read" ON participants FOR SELECT USING (
  profile_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM challenges c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = participants.challenge_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
-- Authenticated users can register themselves
CREATE POLICY "participants: self insert" ON participants FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);
-- Participants can update their own status; admins can update any
CREATE POLICY "participants: own update" ON participants FOR UPDATE USING (
  profile_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM challenges c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = participants.challenge_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- ── submissions ───────────────────────────────────────────────────────────
-- Submitters read own; workspace admins read all
CREATE POLICY "submissions: own read" ON submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants p
    WHERE p.id = submissions.participant_id
      AND p.profile_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM participants p
    JOIN challenges c ON c.id = p.challenge_id
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE p.id = submissions.participant_id
      AND wm.profile_id = auth.uid()::text
      AND wm.role IN ('OWNER', 'ADMIN')
  )
);
-- Participants can submit for themselves only
CREATE POLICY "submissions: participant insert" ON submissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants p
    WHERE p.id = submissions.participant_id
      AND p.profile_id = auth.uid()::text
  )
);
-- Participants can update their own submissions
CREATE POLICY "submissions: own update" ON submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM participants p
    WHERE p.id = submissions.participant_id
      AND p.profile_id = auth.uid()::text
  )
);
