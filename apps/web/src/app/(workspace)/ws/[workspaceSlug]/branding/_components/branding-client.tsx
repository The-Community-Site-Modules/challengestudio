'use client'

import { useState } from 'react'
import { Upload, Check, AlertCircle, Zap, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { cn } from '@/lib/utils'

// ─── Colour contrast checker (WCAG AA simplified) ─────────────────────────
function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1)
  const l2 = hexToLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function ContrastBadge({ bg, fg }: { bg: string; fg: string }) {
  try {
    const ratio = contrastRatio(bg, fg)
    const pass = ratio >= 4.5
    return (
      <div className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}>
        {pass ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
        {ratio.toFixed(1)}:1 WCAG {pass ? 'AA ✓' : 'AA ✗'}
      </div>
    )
  } catch {
    return null
  }
}

// ─── Logo uploader ─────────────────────────────────────────────────────────
function LogoUploader({ label, hint, preview }: { label: string; hint: string; preview?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
          {preview ? (
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-bold text-lg">
              {preview}
            </div>
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1.5">
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-3.5 w-3.5" /> Upload image
          </Button>
          <p className="text-[10px] text-muted-foreground">PNG, SVG or WEBP · max 2MB</p>
        </div>
      </div>
    </div>
  )
}

// ─── Colour picker row ─────────────────────────────────────────────────────
function ColourField({ label, hint, value, onChange }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg border border-border shadow-sm cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => document.getElementById(`color-${label}`)?.click()}
        />
        <input
          id={`color-${label}`}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-32 font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ─── Brand preview panel ───────────────────────────────────────────────────
function BrandPreview({
  name, primary, textOnPrimary,
}: { name: string; primary: string; accent: string; textOnPrimary: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      {/* Mock nav */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: primary }}>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
          <Zap className="h-3.5 w-3.5" style={{ color: textOnPrimary }} />
        </div>
        <span className="text-sm font-bold" style={{ color: textOnPrimary }}>{name}</span>
      </div>
      {/* Mock content */}
      <div className="bg-white p-5 space-y-3">
        <div className="h-4 w-3/4 rounded-full bg-muted" />
        <div className="h-3 w-full rounded-full bg-muted/60" />
        <div className="h-3 w-5/6 rounded-full bg-muted/60" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 flex-1 rounded-lg" style={{ backgroundColor: primary }} />
          <div className="h-9 flex-1 rounded-lg border-2" style={{ borderColor: primary }} />
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function BrandingClient() {
  const [name, setName] = useState('Acme Coaching')
  const [primary, setPrimary] = useState('#2563EB')
  const [accent, setAccent] = useState('#7C3AED')
  const [senderName, setSenderName] = useState('Robert Evans')
  const [senderEmail, setSenderEmail] = useState('robert@acmecoaching.com')
  const [supportEmail, setSupportEmail] = useState('support@acmecoaching.com')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>

      <main className="flex-1 overflow-y-auto p-8">
        <PageHeader
          title="Branding"
          description="Customise how your workspace looks to participants across all public pages."
          action={
            <Button onClick={handleSave} className="gap-2">
              {saved ? <><Check className="h-4 w-4" /> Saved!</> : 'Save changes'}
            </Button>
          }
        />

        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_300px]">
          {/* Left — form */}
          <div className="space-y-8 max-w-2xl">

            {/* Identity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Workspace identity</CardTitle>
                <CardDescription>Name and logo shown on all pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Workspace name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="max-w-sm" />
                </div>
                <Separator />
                <LogoUploader
                  label="Logo"
                  hint="Shown in the nav bar and email headers. Recommended 200×60px."
                  preview="AC"
                />
                <Separator />
                <LogoUploader
                  label="Favicon / icon"
                  hint="Shown in browser tab and mobile home screen. 512×512px square."
                />
              </CardContent>
            </Card>

            {/* Colours */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Colours</CardTitle>
                <CardDescription>Used across buttons, badges, headers, and CTAs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <ColourField
                    label="Primary colour"
                    hint="Main CTAs, active states, progress."
                    value={primary}
                    onChange={setPrimary}
                  />
                  <ColourField
                    label="Accent colour"
                    hint="Secondary highlights and badges."
                    value={accent}
                    onChange={setAccent}
                  />
                </div>

                {/* Contrast checks */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Accessibility checks</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Primary on white:</span>
                      <ContrastBadge bg={primary} fg="#ffffff" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>White on primary:</span>
                      <ContrastBadge bg="#ffffff" fg={primary} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    WCAG AA requires a minimum 4.5:1 contrast ratio for normal text.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Email identity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Email sender identity</CardTitle>
                <CardDescription>
                  Name and address shown in challenge emails. Must match a verified domain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>From name</Label>
                  <Input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="e.g. Robert Evans"
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>From email address</Label>
                  <Input
                    type="email"
                    value={senderEmail}
                    onChange={e => setSenderEmail(e.target.value)}
                    placeholder="hello@yourdomain.com"
                    className="max-w-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Domain verification required before sending. Configure in{' '}
                    <span className="text-primary cursor-pointer hover:underline">Integrations</span>.
                  </p>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>Support / reply-to email</Label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    placeholder="support@yourdomain.com"
                    className="max-w-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Legal links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Legal links</CardTitle>
                <CardDescription>Shown in registration forms and email footers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Privacy policy URL</Label>
                  <Input type="url" placeholder="https://acmecoaching.com/privacy" className="max-w-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Terms of service URL</Label>
                  <Input type="url" placeholder="https://acmecoaching.com/terms" className="max-w-sm" />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right — live preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">Live preview</p>
            </div>
            <BrandPreview
              name={name}
              primary={primary}
              accent={accent}
              textOnPrimary="#ffffff"
            />
            <p className="text-xs text-muted-foreground text-center">
              Updates as you edit
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
