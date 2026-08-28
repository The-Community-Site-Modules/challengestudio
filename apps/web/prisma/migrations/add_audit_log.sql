-- Milestone 10: the audit log.
--
-- PRD §17.3 requires data exports be "permission-checked, logged, and designed
-- to avoid unintentionally exposing private submission content". The first and
-- third are code; this is the second. Append-only by convention — nothing in
-- the app updates or deletes a row here.

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"           TEXT PRIMARY KEY,
  "workspace_id" TEXT NOT NULL,
  "actor_id"     TEXT NOT NULL,
  "action"       TEXT NOT NULL,
  "subject_id"   TEXT,
  "detail"       JSONB,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_created_idx"
  ON "audit_logs"("workspace_id", "created_at");
