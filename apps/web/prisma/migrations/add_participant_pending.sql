-- Approval-gated registration.
--
-- Challenge.requiresApproval was collected by the wizard and stored, but the
-- funnel had no way to represent "registered, waiting to be let in" — every
-- participant landed on REGISTERED, so ticking the box did nothing.
--
-- PENDING is added before REGISTERED so the enum reads in lifecycle order.
-- ADD VALUE is idempotent with IF NOT EXISTS and cannot be rolled back, which
-- is fine: an unused enum value is harmless.

ALTER TYPE "ParticipantStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'REGISTERED';
