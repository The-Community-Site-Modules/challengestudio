'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { signUpAction } from '../actions'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const [showPassword, setShowPassword] = useState(false)
  const [password,     setPassword]     = useState('')
  const [isPending,    startTransition]  = useTransition()

  useEffect(() => {
    if (error) toast.error(decodeURIComponent(error))
  }, [error])

  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one number',   met: /\d/.test(password) },
  ]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await signUpAction(formData)
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Start building your first challenge — free, no credit card needed.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jane"
                autoComplete="given-name"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Smith"
                autoComplete="family-name"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength hints */}
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rules.map(rule => (
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
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground">
            By creating an account you agree to our{' '}
            <Link href="/legal/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/legal/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</>
              : <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>

        <Separator />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
