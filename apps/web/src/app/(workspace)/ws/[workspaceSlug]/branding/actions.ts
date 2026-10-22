'use server'

/**
 * Saving a workspace's branding.
 *
 * The page this replaces saved nothing: its button flashed "Saved!" for two and
 * a half seconds and threw the form away. Everything here is written, and
 * everything written is read somewhere a participant sees it — see the fields'
 * comments in schema.prisma.
 *
 * Gated on `workspace.branding.manage`, which only an owner holds. The page
 * shows the same form read-only to anyone else, so an admin is not shown
 * controls that would be refused.
 *
 * Every value is checked here, not trusted from the form: colours must be
 * #RRGGBB (they reach a style attribute), links must be https (they reach a
 * registration page and an email), and the sender name is cleaned of anything
 * that could add an email header.
 */

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { hasPermission } from '@/lib/permissions'
import { isHexColor, safeEmail, safeHttpsUrl, safeSenderName } from '@/lib/branding'

export interface BrandingInput {
  name: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  accentColor: string | null
  senderName: string | null
  supportEmail: string | null
  privacyUrl: string | null
  termsUrl: string | null
}

export type BrandingResult =
  | { ok: true }
  | { ok: false; error: string; field?: keyof BrandingInput }

const blank = (v: string | null | undefined) => !v || !v.trim()

export async function saveBrandingAction(
  workspaceSlug: string,
  input: BrandingInput
): Promise<BrandingResult> {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) return { ok: false, error: 'That workspace does not exist.' }

  if (!(await hasPermission(user.id, workspace.id, 'workspace.branding.manage'))) {
    return { ok: false, error: 'Only a workspace owner can change its branding.' }
  }

  const name = (input.name ?? '').trim()
  if (!name) return { ok: false, error: 'The workspace needs a name.', field: 'name' }
  if (name.length > 80) return { ok: false, error: 'Keep the name under 80 characters.', field: 'name' }

  // An empty field clears the value; anything typed must be valid. Silently
  // dropping a bad value would look saved and not be.
  const url = (field: keyof BrandingInput, label: string) => {
    const raw = input[field] as string | null
    if (blank(raw)) return { value: null }
    const value = safeHttpsUrl(raw)
    return value ? { value } : { error: `${label} must be a full https:// address.`, field }
  }
  const colour = (field: 'primaryColor' | 'accentColor', label: string) => {
    const raw = input[field]
    if (blank(raw)) return { value: null }
    const value = raw!.trim().toLowerCase()
    return isHexColor(value) ? { value } : { error: `${label} must look like #2563eb.`, field }
  }

  const checks = {
    logoUrl:      url('logoUrl', 'The logo'),
    faviconUrl:   url('faviconUrl', 'The icon'),
    privacyUrl:   url('privacyUrl', 'The privacy policy link'),
    termsUrl:     url('termsUrl', 'The terms link'),
    primaryColor: colour('primaryColor', 'The primary colour'),
    accentColor:  colour('accentColor', 'The accent colour'),
  }
  for (const c of Object.values(checks)) {
    if ('error' in c) return { ok: false, error: c.error!, field: c.field as keyof BrandingInput }
  }

  let supportEmail: string | null = null
  if (!blank(input.supportEmail)) {
    supportEmail = safeEmail(input.supportEmail)
    if (!supportEmail) {
      return { ok: false, error: 'The support email is not a valid address.', field: 'supportEmail' }
    }
  }

  const value = <T,>(c: { value?: T | null }) => c.value ?? null

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      name,
      logoUrl:      value(checks.logoUrl),
      faviconUrl:   value(checks.faviconUrl),
      primaryColor: value(checks.primaryColor),
      accentColor:  value(checks.accentColor),
      senderName:   safeSenderName(input.senderName),
      supportEmail,
      privacyUrl:   value(checks.privacyUrl),
      termsUrl:     value(checks.termsUrl),
    },
  })

  // The branding reaches every page in the workspace and every public
  // challenge page, so refresh the lot rather than guess which are cached.
  revalidatePath(`/ws/${workspaceSlug}`, 'layout')
  revalidatePath('/c', 'layout')
  revalidatePath('/dashboard', 'layout')

  return { ok: true }
}
