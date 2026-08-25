// Challenge domain schema — challenges, challenge_steps, content_blocks
// Milestone 4: Challenge Domain
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules:
//   - content_blocks.payload_json validated by Zod per block_type (not DB constraint)
//   - challenge.timezone stored as IANA string (e.g. 'America/New_York')
//   - challenge.status state machine: draft→scheduled→published→closed→completed→archived
//   - challenge_steps.position is integer — reordering updates positions in a transaction
//
// export const challenges = pgTable('challenges', { ... })
// export const challengeSteps = pgTable('challenge_steps', { ... })
// export const contentBlocks = pgTable('content_blocks', { ... })

export {}
