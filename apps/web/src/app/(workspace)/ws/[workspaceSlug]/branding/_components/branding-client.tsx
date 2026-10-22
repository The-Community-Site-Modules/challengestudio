'use client'

/**
 * The Branding form.
 *
 * This file used to be a mock: "Acme Coaching", "Robert Evans" and
 * robert@acmecoaching.com hardcoded into state, two upload buttons with no
 * handler, and a Save that flashed "Saved!" and kept nothing. It now edits the
 * workspace's real values and saves them through `saveBrandingAction`.
 *
 * Two fields from the mock are gone on purpose:
 *
 * - "From email address". Mail can only be sent from a domain verified with the
 *   email provider, and that is this platform's domain, not each customer's.
 *   A field that accepted robert@acmecoaching.com would have saved and then
 *   failed every send. The From *name* is the creator's; the address is ours,
 *   and the preview below shows both.
 * - Nothing else was removed — but every field that remains is read somewhere
 *   a participant sees it (see schema.prisma), which the mock's were not.
 */

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, AlertCircle, Eye, Loader2, Lock, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { UploadField } from '@/components/challenge/upload-field'
import { cn } from '@/lib/utils'
import { contrastRatio, foregroundFor, isHexColor } from '@/lib/branding'
import { saveBrandingAction, type BrandingInput } from '../actions'

/** The platform's own colours — what a workspace gets until it picks its own. */
const DEFAULT_PRIMARY = '#4f46e5'
const DEFAULT_ACCENT = '#7c3aed'

interface Props {
  workspaceSlug: string
  initial: BrandingInput
  canEdit: boolean
  platformSender: string
  /** What the From name is when the workspace has not set one. */
  platformSenderName: string
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function ContrastBadge({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  const ratio = contrastRatio(bg, fg)
  const pass = ratio >= 4.5
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className={cn(
        'flex items-center gap-1 rounded-md px-2 py-0.5 font-medium',
        pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}>
        {pass ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        {ratio.toFixed(1)}:1 {pass ? 'AA ✓' : 'below AA'}
      </span>
    </div>
  )
}

function ImageField({ label, hint, value, onChange, disabled, square, fallback }: {
  label: string
  hint: string
  value: string | null
  onChange: (url: string | null) => void
  disabled: boolean
  square?: boolean
  fallback: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className={cn(
          'flex h-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30',
          square ? 'w-16' : 'w-40'
        )}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">{fallback}</span>
          )}
        </div>
        {!disabled && (
          <div className="w-52 space-y-1.5">
            <UploadField
              kind="image"
              label={value ? 'Replace image' : 'Upload image'}
              // A favicon is square by definition; a logo is whatever shape the
              // mark is, so it keeps its own and can only be zoomed into.
              adjust={square ? { aspect: 1, outputWidth: 512 } : { aspect: 'source', outputWidth: 800 }}
              onUploaded={(url) => onChange(url)}
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ColourField({ label, hint, value, fallback, onChange, disabled, invalid }: {
  label: string
  hint: string
  value: string
  fallback: string
  onChange: (v: string) => void
  disabled: boolean
  invalid: boolean
}) {
  const id = `colour-${label.replace(/\s+/g, '-').toLowerCase()}`
  const shown = isHexColor(value) ? value : fallback
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">
        <label
          className={cn(
            'relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
          style={{ backgroundColor: shown }}
        >
          <span className="sr-only">Pick {label.toLowerCase()}</span>
          <input
            type="color"
            value={shown}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          id={id}
          value={value}
          placeholder={`${fallback} (default)`}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={7}
          aria-invalid={invalid || undefined}
          className={cn('w-36 font-mono text-sm', invalid && 'border-red-400')}
        />
        {value && !disabled && (
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9"
            onClick={() => onChange('')} title="Use the default">
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Use the default</span>
          </Button>
        )}
      </div>
    </div>
  )
}

function BrandPreview({ name, logoUrl, primary, accent }: {
  name: string; logoUrl: string | null; primary: string; accent: string
}) {
  const fg = foregroundFor(primary)
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: primary }}>
        <div className="flex h-7 max-w-[96px] items-center justify-center overflow-hidden rounded-md bg-white/20 px-1">
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt="" className="h-6 w-auto object-contain" />
            : <span className="text-xs font-bold" style={{ color: fg }}>{name.trim().charAt(0).toUpperCase() || 'W'}</span>}
        </div>
        <span className="truncate text-sm font-bold" style={{ color: fg }}>{name || 'Workspace'}</span>
      </div>
      <div className="space-y-3 bg-white p-5">
        <div className="h-4 w-3/4 rounded-full bg-muted" />
        <div className="h-3 w-full rounded-full bg-muted/60" />
        <div
          className="mt-2 rounded-xl p-4 text-xs font-semibold"
          style={{ backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`, color: fg }}
        >
          Welcome — Day 1 opens soon
        </div>
        <div className="flex gap-2">
          <div className="flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-semibold"
            style={{ backgroundColor: primary, color: fg }}>Register</div>
          <div className="h-9 flex-1 rounded-lg border-2" style={{ borderColor: primary }} />
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const norm = (v: string | null | undefined) => (v ?? '').trim()

export default function BrandingClient({
  workspaceSlug, initial, canEdit, platformSender, platformSenderName,
}: Props) {
  const [saved, setSaved] = useState<BrandingInput>(initial)
  const [name, setName] = useState(initial.name)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(initial.faviconUrl)
  const [primary, setPrimary] = useState(initial.primaryColor ?? '')
  const [accent, setAccent] = useState(initial.accentColor ?? '')
  const [senderName, setSenderName] = useState(initial.senderName ?? '')
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail ?? '')
  const [privacyUrl, setPrivacyUrl] = useState(initial.privacyUrl ?? '')
  const [termsUrl, setTermsUrl] = useState(initial.termsUrl ?? '')

  const [error, setError] = useState<{ message: string; field?: keyof BrandingInput } | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [isSaving, startSaving] = useTransition()

  const current: BrandingInput = {
    name, logoUrl, faviconUrl,
    primaryColor: norm(primary) || null,
    accentColor: norm(accent) || null,
    senderName: norm(senderName) || null,
    supportEmail: norm(supportEmail) || null,
    privacyUrl: norm(privacyUrl) || null,
    termsUrl: norm(termsUrl) || null,
  }

  const dirty = useMemo(() => (Object.keys(current) as (keyof BrandingInput)[])
    .some((k) => norm(current[k] as string | null) !== norm(saved[k] as string | null)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [JSON.stringify(current), saved])

  const shownPrimary = isHexColor(primary.toLowerCase()) ? primary.toLowerCase() : DEFAULT_PRIMARY
  const shownAccent = isHexColor(accent.toLowerCase()) ? accent.toLowerCase() : DEFAULT_ACCENT
  const fromLine = `${norm(senderName) || platformSenderName} <${platformSender}>`

  function touch() {
    setJustSaved(false)
    if (error) setError(null)
  }

  function save() {
    setError(null)
    startSaving(async () => {
      try {
        const result = await saveBrandingAction(workspaceSlug, current)
        if (!result.ok) {
          setError({ message: result.error, ...(result.field ? { field: result.field } : {}) })
          return
        }
        setSaved(current)
        setJustSaved(true)
      } catch {
        setError({ message: 'Your changes were not saved. Check your connection and try again.' })
      }
    })
  }

  function discard() {
    setName(saved.name); setLogoUrl(saved.logoUrl); setFaviconUrl(saved.faviconUrl)
    setPrimary(saved.primaryColor ?? ''); setAccent(saved.accentColor ?? '')
    setSenderName(saved.senderName ?? ''); setSupportEmail(saved.supportEmail ?? '')
    setPrivacyUrl(saved.privacyUrl ?? ''); setTermsUrl(saved.termsUrl ?? '')
    setError(null)
  }

  const bad = (f: keyof BrandingInput) => error?.field === f
  const off = !canEdit || isSaving

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Branding"
        description="How your workspace looks to participants on its challenge pages and in its emails."
        action={canEdit ? (
          <div className="flex items-center gap-2">
            {dirty && !isSaving && (
              <Button type="button" variant="ghost" onClick={discard}>Discard</Button>
            )}
            <Button type="button" onClick={save} disabled={!dirty || isSaving} className="gap-2">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : justSaved && !dirty ? <><Check className="h-4 w-4" /> Saved</>
                : 'Save changes'}
            </Button>
          </div>
        ) : undefined}
      />

      {!canEdit && (
        <p className="mt-6 flex max-w-2xl items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          Only a workspace owner can change branding. This is how it is set now.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 flex max-w-2xl items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error.message}
        </p>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_300px]">
        <div className="max-w-2xl space-y-8">

          {/* Identity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Workspace identity</CardTitle>
              <CardDescription>Shown on your public challenge pages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input id="ws-name" value={name} disabled={off} maxLength={80}
                  aria-invalid={bad('name') || undefined}
                  className={cn('max-w-sm', bad('name') && 'border-red-400')}
                  onChange={(e) => { setName(e.target.value); touch() }} />
              </div>
              <Separator />
              <ImageField
                label="Logo"
                hint="Shown at the top of your registration page. A wide mark works best."
                value={logoUrl}
                onChange={(v) => { setLogoUrl(v); touch() }}
                disabled={off}
                fallback={name.trim().charAt(0).toUpperCase() || 'W'}
              />
              <Separator />
              <ImageField
                label="Favicon / icon"
                hint="Shown in the browser tab on your challenge pages. Square."
                value={faviconUrl}
                onChange={(v) => { setFaviconUrl(v); touch() }}
                disabled={off}
                square
                fallback="—"
              />
            </CardContent>
          </Card>

          {/* Colours */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Colours</CardTitle>
              <CardDescription>
                Applied to every page a participant sees in your challenges. Leave empty to use ours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <ColourField label="Primary colour" hint="Buttons, headers, progress."
                  value={primary} fallback={DEFAULT_PRIMARY} disabled={off} invalid={bad('primaryColor')}
                  onChange={(v) => { setPrimary(v); touch() }} />
                <ColourField label="Accent colour" hint="The second colour in welcome and completion banners."
                  value={accent} fallback={DEFAULT_ACCENT} disabled={off} invalid={bad('accentColor')}
                  onChange={(v) => { setAccent(v); touch() }} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Readability</p>
                {/* The text colour on a button is chosen from the colour, so
                    this checks the pairing that will actually be shown. */}
                <ContrastBadge label="Button text on primary:" bg={shownPrimary} fg={foregroundFor(shownPrimary)} />
                <ContrastBadge label="Primary links on white:" bg="#ffffff" fg={shownPrimary} />
                <p className="text-[11px] text-muted-foreground">
                  Button text switches between white and dark on its own, whichever reads better.
                  WCAG AA asks for at least 4.5:1.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Challenge emails</CardTitle>
              <CardDescription>
                How your welcome, reminder and completion emails appear in an inbox.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="sender-name">From name</Label>
                <Input id="sender-name" value={senderName} disabled={off} maxLength={60}
                  placeholder={`${platformSenderName} (default)`} className="max-w-sm"
                  onChange={(e) => { setSenderName(e.target.value); touch() }} />
                <p className="text-xs text-muted-foreground">
                  Participants see: <span className="font-mono text-foreground">{fromLine}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  The address stays ours — mail can only be sent from a domain verified with
                  our email provider. Replies go to your support email below.
                </p>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="support-email">Support email (replies go here)</Label>
                <Input id="support-email" type="email" value={supportEmail} disabled={off}
                  placeholder="support@yourdomain.com"
                  aria-invalid={bad('supportEmail') || undefined}
                  className={cn('max-w-sm', bad('supportEmail') && 'border-red-400')}
                  onChange={(e) => { setSupportEmail(e.target.value); touch() }} />
                <p className="text-xs text-muted-foreground">
                  When a participant presses Reply on one of your challenge emails, it reaches this inbox.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your legal links</CardTitle>
              <CardDescription>
                Shown next to ours on your registration form, and at the foot of your challenge emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="privacy-url">Privacy policy</Label>
                <Input id="privacy-url" type="url" value={privacyUrl} disabled={off}
                  placeholder="https://yourdomain.com/privacy"
                  aria-invalid={bad('privacyUrl') || undefined}
                  className={cn('max-w-sm', bad('privacyUrl') && 'border-red-400')}
                  onChange={(e) => { setPrivacyUrl(e.target.value); touch() }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="terms-url">Terms of service</Label>
                <Input id="terms-url" type="url" value={termsUrl} disabled={off}
                  placeholder="https://yourdomain.com/terms"
                  aria-invalid={bad('termsUrl') || undefined}
                  className={cn('max-w-sm', bad('termsUrl') && 'border-red-400')}
                  onChange={(e) => { setTermsUrl(e.target.value); touch() }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">Live preview</p>
          </div>
          <BrandPreview name={name} logoUrl={logoUrl} primary={shownPrimary} accent={shownAccent} />
          <p className="text-center text-xs text-muted-foreground">
            Updates as you edit. <Link href={`/ws/${workspaceSlug}/challenges`} className="underline">
            Open a challenge</Link> after saving to see it for real.
          </p>
        </div>
      </div>
    </main>
  )
}
