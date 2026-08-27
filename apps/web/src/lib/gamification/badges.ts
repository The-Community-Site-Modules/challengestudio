/**
 * Badge definitions (milestone 7).
 *
 * Definitions live in code rather than a table. Only the *award* is a row, so
 * there is no seeding step that can drift from the rules the code actually
 * evaluates, and adding a badge is a deploy rather than a migration.
 *
 * Each badge answers one question about a snapshot of a participant's progress.
 * They are deliberately pure: given the same snapshot they award the same set,
 * which is what makes them testable and re-runnable.
 */

export interface ProgressSnapshot {
  /** Required steps finished. */
  completedSteps: number
  /** Required steps in the challenge. */
  totalSteps: number
  /** Consecutive days with at least one submission, counting back from today. */
  streak: number
  /** Posts this participant has written in the challenge feed. */
  posts: number
  /** Comments this participant has left. */
  comments: number
}

export interface BadgeDefinition {
  key: string
  name: string
  description: string
  icon: string
  earned: (p: ProgressSnapshot) => boolean
}

export const BADGES: readonly BadgeDefinition[] = [
  {
    key: 'first_step',
    name: 'First step',
    description: 'Completed your first step.',
    icon: '🏁',
    earned: (p) => p.completedSteps >= 1,
  },
  {
    key: 'halfway',
    name: 'Halfway',
    description: 'Completed half of the challenge.',
    icon: '⚡',
    // Guarded against a challenge with no required steps, where every
    // participant would otherwise be halfway through nothing.
    earned: (p) => p.totalSteps > 0 && p.completedSteps * 2 >= p.totalSteps,
  },
  {
    key: 'finisher',
    name: 'Finisher',
    description: 'Completed every required step.',
    icon: '🏆',
    earned: (p) => p.totalSteps > 0 && p.completedSteps >= p.totalSteps,
  },
  {
    key: 'streak_3',
    name: 'Three in a row',
    description: 'Submitted something three days running.',
    icon: '🔥',
    earned: (p) => p.streak >= 3,
  },
  {
    key: 'streak_7',
    name: 'Week strong',
    description: 'Submitted something seven days running.',
    icon: '💪',
    earned: (p) => p.streak >= 7,
  },
  {
    key: 'first_post',
    name: 'Spoke up',
    description: 'Posted in the challenge feed.',
    icon: '✍️',
    earned: (p) => p.posts >= 1,
  },
  {
    key: 'encourager',
    name: 'Encourager',
    description: 'Left five comments on other people’s posts.',
    icon: '💬',
    earned: (p) => p.comments >= 5,
  },
] as const

const BY_KEY = new Map(BADGES.map((b) => [b.key, b]))

export function badgeByKey(key: string): BadgeDefinition | undefined {
  return BY_KEY.get(key)
}

/** Every badge this snapshot qualifies for, whether or not already awarded. */
export function earnedBadgeKeys(progress: ProgressSnapshot): string[] {
  return BADGES.filter((b) => b.earned(progress)).map((b) => b.key)
}
