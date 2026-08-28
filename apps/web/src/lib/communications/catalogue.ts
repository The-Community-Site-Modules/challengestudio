/**
 * The message catalogue (PRD §15, milestone 8).
 *
 * Ten message types, each with the trigger that fires it. Defined in code and
 * overridden by a row only where a creator has changed something — the same
 * shape as badges, so there is no seeding step and no stored template that can
 * drift from the trigger the code actually fires.
 *
 * Two properties matter more than the copy:
 *
 *   `essential` decides whether unsubscribing silences it. §15.2 is explicit
 *   that people keep receiving "security, access, and legally required"
 *   messages however they set their preferences, so those are marked here and
 *   the sender never asks about preferences for them.
 *
 *   `variables` is a closed list. §15.1 asks for "safe template variables";
 *   rendering only substitutes names on this list, so a template cannot reach
 *   for something it was never offered.
 */

export type Trigger =
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

/** How a message gets fired, which decides where it comes from. */
export type Firing =
  /** Fired by something a person just did, from the action that did it. */
  | 'event'
  /** Fired by the clock, from the sweep in scheduled.ts. */
  | 'scheduled'
  /**
   * Sent by the auth provider, not by us. Supabase owns the magic link and the
   * token inside it; sending our own version would either arrive without a
   * working link or duplicate theirs. Editing it means editing the template in
   * the Supabase dashboard.
   */
  | 'provider'

export interface MessageDefinition {
  trigger: Trigger
  name: string
  /** What causes it, in the creator's words. */
  when: string
  firing: Firing
  /** Ignores unsubscribe — access, security, and legally required mail. */
  essential: boolean
  defaultSubject: string
  defaultBody: string
  variables: readonly string[]
}

const COMMON = ['participantName', 'challengeTitle', 'workspaceName'] as const

export const MESSAGES: readonly MessageDefinition[] = [
  {
    trigger: 'registration_confirm',
    name: 'Registration confirmation',
    when: 'Someone registers for the challenge',
    firing: 'event',
    // Confirms access to a thing they just signed up for.
    essential: true,
    defaultSubject: "You're registered for {{challengeTitle}}",
    defaultBody:
      'Hi {{participantName}},\n\n' +
      "You're registered for {{challengeTitle}}, hosted by {{workspaceName}}.\n\n" +
      'We will email you when it begins.',
    variables: [...COMMON, 'startDate'],
  },
  {
    trigger: 'account_setup',
    name: 'Account access',
    when: 'A registration needs an account created',
    firing: 'provider',
    essential: true,
    defaultSubject: 'Your sign-in link for {{challengeTitle}}',
    defaultBody:
      'Hi {{participantName}},\n\n' +
      'Use the link below to sign in and start {{challengeTitle}}.\n\n{{actionUrl}}',
    variables: [...COMMON, 'actionUrl'],
  },
  {
    trigger: 'challenge_starting',
    name: 'Challenge starting soon',
    when: 'A configured time before the start date',
    firing: 'scheduled',
    essential: false,
    defaultSubject: '{{challengeTitle}} starts {{startDate}}',
    defaultBody:
      'Hi {{participantName}},\n\n{{challengeTitle}} starts {{startDate}}. See you there.',
    variables: [...COMMON, 'startDate'],
  },
  {
    trigger: 'day_available',
    name: 'Day available',
    when: 'A step unlocks for a participant',
    firing: 'scheduled',
    essential: false,
    defaultSubject: '{{stepTitle}} is open',
    defaultBody:
      'Hi {{participantName}},\n\n{{stepTitle}} of {{challengeTitle}} is now open.\n\n{{actionUrl}}',
    variables: [...COMMON, 'stepTitle', 'actionUrl'],
  },
  {
    trigger: 'session_reminder',
    name: 'Live session reminder',
    when: 'A configured time before a live session',
    firing: 'scheduled',
    essential: false,
    defaultSubject: 'Live session for {{challengeTitle}}',
    defaultBody: 'Hi {{participantName}},\n\nYour live session is coming up.\n\n{{actionUrl}}',
    variables: [...COMMON, 'actionUrl'],
  },
  {
    trigger: 'inactivity_nudge',
    name: 'Inactivity nudge',
    when: 'No progress for a configured interval',
    firing: 'scheduled',
    essential: false,
    defaultSubject: 'Pick {{challengeTitle}} back up',
    defaultBody:
      'Hi {{participantName}},\n\n' +
      'You have not been back to {{challengeTitle}} in a while. Your place is still there.\n\n{{actionUrl}}',
    variables: [...COMMON, 'actionUrl'],
  },
  {
    trigger: 'submission_feedback',
    name: 'Submission feedback',
    when: 'A facilitator comments on or reviews work',
    firing: 'event',
    essential: false,
    defaultSubject: 'Feedback on your work in {{challengeTitle}}',
    defaultBody:
      'Hi {{participantName}},\n\nYou have feedback on {{stepTitle}}.\n\n{{actionUrl}}',
    variables: [...COMMON, 'stepTitle', 'actionUrl'],
  },
  {
    trigger: 'milestone_earned',
    name: 'Milestone earned',
    when: 'A badge or progress milestone is reached',
    firing: 'event',
    essential: false,
    defaultSubject: 'You earned {{badgeName}}',
    defaultBody:
      'Hi {{participantName}},\n\nYou earned {{badgeName}} in {{challengeTitle}}. Nicely done.',
    variables: [...COMMON, 'badgeName'],
  },
  {
    trigger: 'completion',
    name: 'Challenge completion',
    when: 'A participant finishes every required step',
    firing: 'event',
    essential: false,
    defaultSubject: 'You finished {{challengeTitle}}',
    defaultBody:
      'Hi {{participantName}},\n\n' +
      'You finished {{challengeTitle}}. See what you did:\n\n{{actionUrl}}',
    variables: [...COMMON, 'actionUrl'],
  },
  {
    trigger: 'offer_closing',
    name: 'Offer closing',
    when: 'A configured marketing deadline',
    firing: 'scheduled',
    essential: false,
    defaultSubject: 'Last chance from {{workspaceName}}',
    defaultBody: 'Hi {{participantName}},\n\nThis closes soon.\n\n{{actionUrl}}',
    variables: [...COMMON, 'actionUrl'],
  },
] as const

const BY_TRIGGER = new Map(MESSAGES.map((m) => [m.trigger, m]))

export function messageFor(trigger: Trigger): MessageDefinition | undefined {
  return BY_TRIGGER.get(trigger)
}

export function isEssential(trigger: Trigger): boolean {
  return BY_TRIGGER.get(trigger)?.essential ?? false
}

/**
 * Substitute {{variables}} declared by this message, and nothing else.
 *
 * An unknown or undeclared placeholder is left standing rather than replaced
 * with "undefined" — a visible {{typo}} in a test send is a bug someone fixes,
 * where the word "undefined" in a participant's inbox is one nobody notices.
 */
export function render(
  template: string,
  trigger: Trigger,
  values: Record<string, string | undefined>
): string {
  const allowed = new Set(BY_TRIGGER.get(trigger)?.variables ?? [])
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    if (!allowed.has(name)) return whole
    const value = values[name]
    return value === undefined ? whole : value
  })
}
