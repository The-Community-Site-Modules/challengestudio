// Shared Zod validation schemas
// Used in both Server Actions (server) and React Hook Form (client)
// Ensures validation rules are defined once and never duplicated

import { z } from 'zod'

// ─── Common ───────────────────────────────────────────────────────────────

export const slugSchema = z
  .string()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Must be a valid hex color e.g. #1A2B3C' })

// ─── Auth ─────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Workspace ────────────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  slug: slugSchema,
})

// ─── Challenge (expanded per milestone) ──────────────────────────────────

export const createChallengeSchema = z.object({
  title: z.string().min(3).max(120),
  internalName: z.string().min(1).max(120),
  slug: slugSchema,
  promise: z.string().min(10).max(300),
  description: z.string().max(2000).optional(),
})

// More schemas added per milestone (builder, enrollment, submissions, etc.)

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>
