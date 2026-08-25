// Shared TypeScript types across the monorepo
// These types mirror the domain model but are safe to use in both
// server and client contexts (no DB-specific types leaked here)

// ─── Challenge Modes (PRD §6) ──────────────────────────────────────────────
export type ChallengeMode =
  | 'marketing'
  | 'evergreen'
  | 'cohort'
  | 'internal'
  | 'paid'
  | 'team'
  | 'habit'
  | 'milestone'

// ─── Challenge Status ──────────────────────────────────────────────────────
export type ChallengeStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'closed'
  | 'completed'
  | 'archived'

// ─── Timing Models (PRD §6.1) ──────────────────────────────────────────────
export type TimingModel =
  | 'fixed_calendar'
  | 'rolling_enrollment'
  | 'open_access'
  | 'sequential_completion'
  | 'scheduled_release'
  | 'weekly_release'

// ─── Content Block Types (PRD §11) ────────────────────────────────────────
export type ContentBlockType =
  | 'heading'
  | 'text'
  | 'video'
  | 'image'
  | 'download'
  | 'checklist'
  | 'assignment'
  | 'text_response'
  | 'file_upload'
  | 'reflection'
  | 'discussion_prompt'
  | 'reward_unlock'
  // Post-MVP:
  | 'quiz'
  | 'external_embed'
  | 'ai_coach'

// ─── Workspace Roles (PRD §7) ─────────────────────────────────────────────
export type WorkspaceRole =
  | 'platform_owner'
  | 'workspace_owner'
  | 'workspace_admin'
  | 'challenge_manager'
  | 'facilitator'
  | 'participant'

// ─── Enrollment Status ────────────────────────────────────────────────────
export type EnrollmentStatus =
  | 'registered'
  | 'active'
  | 'completed'
  | 'withdrawn'
  | 'banned'

// ─── Submission Visibility (PRD §13.2) ────────────────────────────────────
export type SubmissionVisibility =
  | 'private'
  | 'group'
  | 'challenge'
  | 'public_showcase' // Post-MVP

// ─── Email Triggers (PRD §15) ─────────────────────────────────────────────
export type EmailTrigger =
  | 'registration_confirm'
  | 'account_setup'
  | 'challenge_starting'
  | 'day_available'
  | 'session_reminder'
  | 'inactivity_nudge'
  | 'submission_feedback'
  | 'milestone_earned'
  | 'completion'
  | 'offer_closing'

// ─── Step Unlock Status ───────────────────────────────────────────────────
export type StepUnlockStatus = 'locked' | 'available' | 'in_progress' | 'completed'
