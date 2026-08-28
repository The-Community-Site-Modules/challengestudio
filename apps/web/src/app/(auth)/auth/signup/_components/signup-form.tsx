'use client'

/**
 * The sign-up form.
 *
 * Validation runs on submit and then live per field, which is the order that
 * matches how people fill a form: nobody wants to be told their email is
 * invalid while they are still typing the first letter of it. Once a field has
 * been marked wrong, it re-checks on every keystroke so the error clears the
 * moment it is fixed.
 *
 * Every error is announced as well as coloured — `aria-invalid` on the input,
 * `aria-describedby` pointing at the message, and `role="alert"` on the
 * message itself. Red text alone is invisible to a screen reader and to a
 * meaningful number of sighted people.
 */

import { useState, useTransition, useEffect, useId } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight, Loader2, Eye, EyeOff, Check, AlertCircle, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { signUpAction } from '../../actions'
import { scorePassword } from './password-strength'
import { SocialButtons } from './social-buttons'

type FieldName = 'firstName' | 'email' | 'password' | 'terms'
type Errors = Partial<Record<FieldName, string>>

export function SignupForm() {
  const searchParams = useSearchParams()
  const serverError = searchParams.get('error')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const ids = useId()
  const fieldId = (name: string) => `${ids}-${name}`

  const strength = scorePassword(password)

  function validate(): Errors {
    const next: Errors = {}
    if (!firstName.trim()) next.firstName = 'Please tell us your first name.'
    if (!email.trim()) next.email = 'An email address is required.'
    // Deliberately loose: the only authority on whether an address works is
    // whether the verification email arrives. A strict pattern here mostly
    // rejects valid addresses.
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'That does not look like an email address.'
    }
    if (!password) next.password = 'Choose a password.'
    else if (!strength.valid) next.password = 'Your password does not meet the rules below yet.'
    if (!accepted) next.terms = 'Please accept the terms to continue.'
    return next
  }

  // Re-check only after a first attempt, so nobody is corrected mid-word.
  useEffect(() => {
    if (submitted) setErrors(validate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, email, password, accepted, submitted])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = document.getElementById(fieldId(Object.keys(found)[0]!))
      first?.focus()
      return
    }

    const formData = new FormData()
    formData.set('firstName', firstName.trim())
    formData.set('lastName', lastName.trim())
    formData.set('email', email.trim())
    formData.set('password', password)

    startTransition(async () => {
      await signUpAction(formData)
    })
  }

  const invalid = (name: FieldName) => Boolean(errors[name])

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Whatever the server sent back — a taken address, a rate limit. */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/[0.06] p-3.5"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-strong" aria-hidden="true" />
          <p className="text-[13px] leading-relaxed text-foreground">
            {decodeURIComponent(serverError)}
          </p>
        </div>
      )}

      <SocialButtons />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or sign up with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={fieldId('firstName')}
          label="First name"
          error={errors.firstName}
        >
          <Input
            id={fieldId('firstName')}
            name="firstName"
            placeholder="Jane"
            autoComplete="given-name"
            disabled={isPending}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={invalid('firstName')}
            aria-describedby={invalid('firstName') ? `${fieldId('firstName')}-error` : undefined}
            className={cn(invalid('firstName') && 'border-destructive focus-visible:ring-destructive')}
          />
        </Field>

        <Field id={fieldId('lastName')} label="Last name" optional>
          <Input
            id={fieldId('lastName')}
            name="lastName"
            placeholder="Smith"
            autoComplete="family-name"
            disabled={isPending}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>

      {/* Email */}
      <Field id={fieldId('email')} label="Work email" error={errors.email}>
        <Input
          id={fieldId('email')}
          name="email"
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isPending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={invalid('email')}
          aria-describedby={invalid('email') ? `${fieldId('email')}-error` : undefined}
          className={cn(invalid('email') && 'border-destructive focus-visible:ring-destructive')}
        />
      </Field>

      {/* Password */}
      <Field id={fieldId('password')} label="Password" error={errors.password}>
        <div className="relative">
          <Input
            id={fieldId('password')}
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={isPending}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={invalid('password')}
            aria-describedby={cn(
              `${fieldId('password')}-rules`,
              invalid('password') && `${fieldId('password')}-error`
            )}
            className={cn('pr-11', invalid('password') && 'border-destructive focus-visible:ring-destructive')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <StrengthMeter id={`${fieldId('password')}-rules`} password={password} />
      </Field>

      {/* Terms */}
      <div>
        <div className="flex items-start gap-2.5">
          <Checkbox
            id={fieldId('terms')}
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            disabled={isPending}
            aria-invalid={invalid('terms')}
            aria-describedby={invalid('terms') ? `${fieldId('terms')}-error` : undefined}
            className={cn('mt-0.5', invalid('terms') && 'border-destructive')}
          />
          <Label htmlFor={fieldId('terms')} className="text-[13px] font-normal leading-relaxed text-muted-foreground">
            I agree to the{' '}
            <Link href="/legal/terms" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </Label>
        </div>
        {errors.terms && (
          <p id={`${fieldId('terms')}-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-destructive-strong">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errors.terms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Creating your account…
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </>
        )}
      </Button>

      {/* Reassurance */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        We never sell your data, and we email you only about your challenges.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Field({
  id, label, error, optional, children,
}: {
  id: string
  label: string
  error?: string | undefined
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-[13px]">{label}</Label>
        {optional && <span className="text-[11px] text-muted-foreground">Optional</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[13px] text-destructive-strong">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

const BAR_COLOUR = ['bg-muted', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-green-600']
const TEXT_COLOUR = ['text-muted-foreground', 'text-red-600', 'text-amber-600', 'text-lime-700', 'text-green-700']

function StrengthMeter({ id, password }: { id: string; password: string }) {
  const { score, label, rules } = scorePassword(password)

  return (
    <div id={id} className="pt-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                segment <= score ? BAR_COLOUR[score] : 'bg-muted'
              )}
            />
          ))}
        </div>
        {/* Polite, not assertive: this updates on every keystroke and should
            not interrupt what the person is typing. */}
        <span aria-live="polite" className={cn('w-12 text-right text-[11px] font-medium', TEXT_COLOUR[score])}>
          {label}
        </span>
      </div>

      <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center gap-1.5 text-[12px]">
            <span
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full',
                rule.met ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
              )}
            >
              {rule.met
                ? <Check className="h-2.5 w-2.5" aria-hidden="true" />
                : <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />}
            </span>
            <span className={rule.met ? 'text-foreground' : 'text-muted-foreground'}>
              {rule.label}
            </span>
            <span className="sr-only">{rule.met ? ' — met' : ' — not met'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
