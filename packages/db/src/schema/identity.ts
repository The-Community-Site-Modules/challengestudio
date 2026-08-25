// Identity schema — users, sessions, accounts
// Milestone 2: Identity & Tenancy
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
//
// export const users = pgTable('users', {
//   id:                  text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
//   email:               text('email').notNull().unique(),
//   emailVerifiedAt:     timestamp('email_verified_at', { withTimezone: true }),
//   name:                text('name').notNull(),
//   avatarUrl:           text('avatar_url'),
//   externalProviderId:  text('external_provider_id'), // For Community Site identity bridging
//   createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
//   updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
//   deletedAt:           timestamp('deleted_at', { withTimezone: true }),
// })
//
// Auth.js required tables (accounts, sessions, verification_tokens)
// will be added here per Auth.js DrizzleAdapter requirements

export {}
