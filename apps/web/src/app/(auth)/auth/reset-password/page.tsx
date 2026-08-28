'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { resetPasswordAction } from '../actions'
import { AuthShell } from '../../_components/auth-shell'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [showPassword,  setShowPassword]  = useState(false)
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [isPending,     startTransition]  = useTransition()

  useEffect(() => {
    if (error) toast.error(decodeURIComponent(error))
  }, [error])

  // Live password match indicator
  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordsNoMatch = confirm.length > 0 && password !== confirm

  const rules = [
    { label: 'At least 8 characters',          met: password.length >= 8 },
    { label: 'At least one number',             met: /\d/.test(password) },
    { label: 'Passwords match',                 met: passwordsMatch },
  ]
  const allRulesMet = rules.every(r => r.met)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allRulesMet) {
      toast.error('Please fix the issues before continuing.')
      return
    }
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await resetPasswordAction(formData)
      toast.success('Password updated successfully! Redirecting…')
    })
  }

  return (
    <AuthShell>
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isPending}
                  className="pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isPending}
                  className={`pr-10 ${
                    passwordsNoMatch ? 'border-destructive focus-visible:ring-destructive' :
                    passwordsMatch   ? 'border-green-500 focus-visible:ring-green-500'     : ''
                  }`}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordsNoMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {/* Password rules */}
            <ul className="space-y-1.5">
              {rules.map((rule) => (
                <li key={rule.label} className="flex items-center gap-2 text-xs">
                  <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${
                    rule.met ? 'text-green-500' : 'text-muted-foreground'
                  }`} />
                  <span className={rule.met ? 'text-green-700' : 'text-muted-foreground'}>
                    {rule.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending || !allRulesMet}
            >
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating password…</>
                : 'Update password'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
