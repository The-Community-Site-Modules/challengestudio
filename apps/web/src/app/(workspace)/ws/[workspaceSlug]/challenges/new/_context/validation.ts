import type { WizardState } from './wizard-context'

export type FieldErrors = Partial<Record<keyof WizardState, string>>

/**
 * Which fields a step will not let you leave without.
 *
 * Kept in one place rather than inside each step component so the Review step
 * can ask the same question about steps the reader has not opened yet — a
 * challenge that is missing its start date should say so on step 9 whether or
 * not anyone visited step 4.
 */
export function validateStep(step: number, data: WizardState): FieldErrors {
  const errors: FieldErrors = {}
  const blank = (v: string) => v.trim().length === 0

  switch (step) {
    // ── 1. Foundation ────────────────────────────────────────────────────
    case 1: {
      if (blank(data.title)) errors.title = 'Give your challenge a title.'
      else if (data.title.trim().length < 3) errors.title = 'Title must be at least 3 characters.'

      if (blank(data.slug)) errors.slug = 'A URL slug is required.'
      else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
        errors.slug = 'Use lowercase letters, numbers and hyphens only.'
      }
      break
    }

    // ── 2. Outcome ───────────────────────────────────────────────────────
    case 2: {
      if (blank(data.startingPoint)) errors.startingPoint = 'Describe where participants start.'
      if (blank(data.outcome))       errors.outcome       = 'Describe where they end up.'
      if (blank(data.promise))       errors.promise       = 'Write the one-line promise.'
      break
    }

    // ── 3. Mode ──────────────────────────────────────────────────────────
    case 3: {
      if (blank(data.mode)) errors.mode = 'Choose how the challenge runs.'
      break
    }

    // ── 4. Schedule ──────────────────────────────────────────────────────
    case 4: {
      if (blank(data.timezone)) errors.timezone = 'Pick the challenge timezone.'
      if (blank(data.startsAt)) errors.startsAt = 'A start date is required.'

      // Only compare dates that are actually filled in — a missing end date is
      // allowed, an end date before the start is not.
      if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
        errors.endsAt = 'The end date cannot be before the start date.'
      }
      if (data.registrationOpensAt && data.registrationClosesAt &&
          data.registrationClosesAt < data.registrationOpensAt) {
        errors.registrationClosesAt = 'Registration cannot close before it opens.'
      }
      if (data.startsAt && data.registrationOpensAt && data.registrationOpensAt > data.startsAt) {
        errors.registrationOpensAt = 'Registration must open on or before the start date.'
      }
      break
    }

    // ── 5. Audience ──────────────────────────────────────────────────────
    case 5: {
      if (blank(data.visibility)) errors.visibility = 'Choose who can join.'
      if (data.maxParticipants.trim()) {
        const n = Number(data.maxParticipants)
        if (!Number.isInteger(n) || n < 1) {
          errors.maxParticipants = 'Enter a whole number of 1 or more, or leave it blank.'
        }
      }
      break
    }

    // ── 6. Experience ────────────────────────────────────────────────────
    case 6: {
      const days = Number(data.numDays)
      if (blank(data.numDays)) errors.numDays = 'How many days does the challenge run?'
      else if (!Number.isInteger(days) || days < 1) errors.numDays = 'Enter a whole number of 1 or more.'
      else if (days > 365) errors.numDays = 'That is longer than a year — enter 365 or fewer.'
      break
    }

    // ── 7. Communications ────────────────────────────────────────────────
    case 7: {
      // Every field here has a default, and turning all emails off is a valid
      // choice, so nothing is required.
      break
    }

    // ── 8. Conversion ────────────────────────────────────────────────────
    case 8: {
      // Only required once the offer is switched on — an offer is optional,
      // but a half-filled one would publish a broken CTA.
      if (data.hasOffer) {
        if (blank(data.offerHeadline)) errors.offerHeadline = 'The offer needs a headline.'
        if (blank(data.offerCtaText))  errors.offerCtaText  = 'Give the button some text.'
        if (blank(data.offerUrl))      errors.offerUrl      = 'Where should the button send people?'
        else if (!/^https?:\/\/\S+\.\S+/i.test(data.offerUrl.trim())) {
          errors.offerUrl = 'Enter a full URL, starting with https://'
        }
        if (data.offerDeadline && Number.isNaN(Date.parse(data.offerDeadline))) {
          errors.offerDeadline = 'That is not a valid date and time.'
        }
      }
      break
    }
  }

  return errors
}

/** Steps 1–8, in order, that still have something missing. */
export function incompleteSteps(data: WizardState): number[] {
  const out: number[] = []
  for (let s = 1; s <= 8; s++) {
    if (Object.keys(validateStep(s, data)).length > 0) out.push(s)
  }
  return out
}

export const STEP_LABELS: Record<number, string> = {
  1: 'Foundation', 2: 'Outcome', 3: 'Mode', 4: 'Schedule',
  5: 'Audience', 6: 'Experience', 7: 'Communications', 8: 'Conversion',
}
