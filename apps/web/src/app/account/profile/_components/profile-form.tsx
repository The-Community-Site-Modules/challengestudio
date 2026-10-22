'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Loader2, KeyRound, Lock, BadgeCheck, ImageOff, X, Camera, Upload,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { uploadAvatarAction } from '../../upload-actions'
import { ImageAdjuster, isAdjustable } from '@/components/shared/image-adjuster'

/** Mirrors IMAGE_TYPES on the server; the picker filters, the action decides. */
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

interface Props {
  initialName:      string
  initialAvatarUrl: string
  email:            string
  emailVerified:    boolean
  updateAction:          (formData: FormData) => Promise<void>
  requestPasswordChange: () => Promise<void>
}

function initialsOf(name: string, email: string) {
  const source = name.trim() || email
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Mirrors the server's rule, so the form refuses what the action would reject.
 *
 * Nothing in the UI can produce a bad address any more — the only way to set
 * one is an upload, which returns a storage URL. The check stays because the
 * value also arrives as a prop from a row written before this page existed,
 * and because the server still enforces it either way.
 */
function avatarUrlProblem(url: string): string | null {
  if (!url.trim()) return null
  if (!/^https:\/\/\S+$/i.test(url.trim())) return 'That photo address is not usable.'
  return null
}

// ─── Section shell ───────────────────────────────────────────────────────────

function Section({ id, title, description, children }: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none"
    >
      <header className="border-b border-slate-100 px-7 py-6 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  )
}

/** One line in a settings list: label and helper on the left, control on the right. */
function SettingsRow({ icon: Icon, label, description, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
      <div className="flex min-w-0 gap-3.5">
        <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-500" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0 sm:text-right">{children}</div>
    </div>
  )
}

// ─── Form ────────────────────────────────────────────────────────────────────

export function ProfileForm({
  initialName, initialAvatarUrl, email, emailVerified,
  updateAction, requestPasswordChange,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSendingReset, startReset] = useTransition()

  const [name, setName]           = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [editingPhoto, setEditingPhoto] = useState(false)
  // A URL that is well-formed but does not resolve to an image looks identical
  // until the browser tries to load it, so the preview reports that itself.
  const [imageBroken, setImageBroken] = useState(false)
  const [isUploading, setIsUploading]   = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  // Held between picking the file and framing it. Nothing is sent until the
  // adjuster hands back the version the person approved.
  const [adjusting, setAdjusting]       = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  /**
   * Send the file, then hold its address in state.
   *
   * The photo is stored as soon as it is picked — so the preview is the real
   * image rather than a local blob that would vanish on reload — but the
   * profile row is only written when Save changes is pressed. Cancelling
   * leaves an unreferenced object in the bucket, which is the cheaper mistake
   * than a photo that changes before the person agreed to it.
   */
  async function upload(file: File) {
    setUploadError(null)
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const result = await uploadAvatarAction(fd)
      if (result.error) setUploadError(result.error)
      else if (result.url) setAvatarUrl(result.url)
    } catch {
      setUploadError('The upload did not complete. Try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const trimmedName = name.trim()
  const urlProblem  = avatarUrlProblem(avatarUrl)
  const isDirty     = trimmedName !== initialName.trim() || avatarUrl.trim() !== initialAvatarUrl.trim()
  const nameProblem = trimmedName.length === 0 ? 'Your name cannot be empty.' : null
  const canSave     = isDirty && !urlProblem && !nameProblem && !isPending && !isUploading

  useEffect(() => { setImageBroken(false) }, [avatarUrl])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSave) return
    const fd = new FormData()
    fd.set('fullName', trimmedName)
    fd.set('avatarUrl', avatarUrl.trim())
    startTransition(() => updateAction(fd))
  }

  function reset() {
    setName(initialName)
    setAvatarUrl(initialAvatarUrl)
    setEditingPhoto(false)
    setUploadError(null)
  }

  const showPreview = Boolean(avatarUrl.trim()) && !urlProblem && !imageBroken

  return (
    <div className="space-y-6">

      {/* Framing happens before the upload, so what is stored is what was
          seen in the circle rather than a centre crop of a phone photo. */}
      <ImageAdjuster
        file={adjusting}
        target={{ aspect: 1, shape: 'circle', outputWidth: 512 }}
        onCancel={() => setAdjusting(null)}
        onConfirm={(framed) => { setAdjusting(null); void upload(framed) }}
      />

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Section
        id="profile"
        title="Profile"
        description="Update how you appear to your team and challenge participants."
      >
        <form onSubmit={handleSubmit}>

          {/* Identity */}
          <div className="flex flex-col gap-5 px-7 py-7 sm:flex-row sm:items-center sm:px-8">
            <div className="group relative shrink-0">
              <Avatar className="h-20 w-20 ring-1 ring-slate-200">
                {showPreview && (
                  <AvatarImage
                    src={avatarUrl.trim()}
                    alt=""
                    onError={() => setImageBroken(true)}
                  />
                )}
                <AvatarFallback className="bg-indigo-50 text-lg font-semibold text-indigo-700">
                  {initialsOf(name, email)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setEditingPhoto(true)}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/55 opacity-0 outline-none transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Camera className="h-5 w-5 text-white" />
                <span className="sr-only">Change photo</span>
              </button>
            </div>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-slate-900">
                {trimmedName || 'Unnamed'}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">{email}</p>
              <div className="mt-2.5 flex items-center gap-3 text-[13px]">
                <button
                  type="button"
                  onClick={() => setEditingPhoto((v) => !v)}
                  className="font-medium text-indigo-600 outline-none transition-colors hover:text-indigo-700 focus-visible:underline"
                >
                  {editingPhoto ? 'Close' : 'Change photo'}
                </button>
                {avatarUrl.trim() && (
                  <>
                    <span aria-hidden="true" className="h-3 w-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(''); setEditingPhoto(false) }}
                      className="text-slate-500 outline-none transition-colors hover:text-slate-900 focus-visible:underline"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              {imageBroken && !urlProblem && avatarUrl.trim() && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-amber-700">
                  <ImageOff className="h-3.5 w-3.5 shrink-0" />
                  That address did not load. Your initials are shown instead.
                </p>
              )}
            </div>
          </div>

          {/* Photo source. This was an "Image address" field with a note saying
              uploading would arrive with storage support. Storage arrived, so
              the field is gone: nobody has a public https:// address for a
              photo of themselves, they have a file. */}
          {editingPhoto && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-7 py-6 sm:px-8">
              <Label htmlFor="avatarFile" className="text-[13px] font-medium text-slate-700">
                Upload a photo
              </Label>
              <div className="mt-2 flex max-w-md flex-wrap items-center gap-2">
                <input
                  ref={fileInput}
                  id="avatarFile"
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  disabled={isPending || isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    // Clear the input first: picking the same file twice in a
                    // row fires no change event otherwise, so a failed upload
                    // could not be retried with the same photo.
                    e.target.value = ''
                    if (!file) return
                    // An animated GIF redrawn to a canvas keeps one frame, so
                    // it goes up as it is.
                    if (isAdjustable(file)) setAdjusting(file)
                    else void upload(file)
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-white"
                  disabled={isPending || isUploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {isUploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> Choose image</>
                  )}
                </Button>
                {avatarUrl.trim() && !isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 text-slate-500 hover:text-slate-700"
                    disabled={isPending}
                    onClick={() => setAvatarUrl('')}
                  >
                    <X className="mr-2 h-4 w-4" /> Remove photo
                  </Button>
                )}
              </div>
              <p
                id="avatarFile-hint"
                className={cn('mt-2 text-[13px]', uploadError ? 'text-red-600' : 'text-slate-500')}
              >
                {uploadError ?? 'PNG, JPEG, WebP or GIF, up to 5 MB. Save changes to keep it.'}
              </p>
            </div>
          )}

          {/* Fields */}
          <div className="border-t border-slate-100 px-7 py-7 sm:px-8">
            <div className="max-w-md">
              <Label htmlFor="fullName" className="text-[13px] font-medium text-slate-700">
                Full name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                disabled={isPending}
                aria-describedby="fullName-hint"
                className="mt-2 h-10 text-sm"
              />
              <p id="fullName-hint" className="mt-2 text-[13px] text-slate-500">
                This is the name shown to your team and challenge participants.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-7 py-4 sm:px-8">
            <p
              aria-live="polite"
              className={cn(
                'flex items-center gap-2 text-[13px] transition-opacity duration-150',
                isDirty ? 'text-slate-600 opacity-100' : 'opacity-0'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                disabled={!isDirty || isPending}
                className="h-9 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSave}
                className="h-9 gap-2 rounded-lg bg-indigo-600 px-4 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      </Section>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Section
        id="account"
        title="Account"
        description="Manage your sign-in details."
      >
        <SettingsRow
          icon={Lock}
          label="Email address"
          description="Used to sign in and to receive workspace invitations. Changing it needs re-verification, which is not available yet."
        >
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="truncate text-sm text-slate-700">{email}</span>
            {emailVerified && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
          </div>
        </SettingsRow>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <Section
        id="security"
        title="Security"
        description="Keep control of who can sign in as you."
      >
        <SettingsRow
          icon={KeyRound}
          label="Password"
          description="We email a link rather than changing it here, so an unattended session cannot be used to take over the account."
        >
          <Button
            type="button"
            variant="outline"
            disabled={isSendingReset}
            onClick={() => startReset(() => requestPasswordChange())}
            className="h-9 gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            {isSendingReset && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSendingReset ? 'Sending…' : 'Send reset link'}
          </Button>
        </SettingsRow>
      </Section>
    </div>
  )
}
