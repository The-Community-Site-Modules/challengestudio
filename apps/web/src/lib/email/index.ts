// Email service abstraction — provider: Resend (OD-3)
// All sends go through this abstraction — swapping provider = change driver only
//
// Flow: Trigger event → Inngest job → email service → message_deliveries record
// All sends are idempotency-keyed: enrollment_id + trigger_type + day
//
// Transactional/security emails (verify, reset) cannot be suppressed by
// participant unsubscribe preferences per PRD §15.2
//
// TODO: Implement in Milestone 13 (Communications)

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

export async function sendEmail(_params: {
  to: string
  trigger: EmailTrigger
  idempotencyKey: string
  variables: Record<string, string>
}): Promise<void> {
  throw new Error('Email not configured — awaiting Resend credentials (OD-3)')
}
