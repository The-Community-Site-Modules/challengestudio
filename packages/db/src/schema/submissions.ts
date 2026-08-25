// Submissions schema — participant responses and uploaded evidence
// Milestone 9: Participant Experience
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules (PRD §13.2, §17.2, §23):
//   - submissions.visibility enforced at query level — NEVER bypass in exports
//   - private reflections must never appear in feeds, exports, or admin views
//     without submission.view_private capability check
//   - file submissions reference uploads table (not direct URLs)
//
// export const submissions = pgTable('submissions', { ... })
// export const uploads = pgTable('uploads', { ... })

export {}
