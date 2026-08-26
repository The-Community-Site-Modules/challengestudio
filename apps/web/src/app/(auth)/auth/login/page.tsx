'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { signInAction, signInWithMagicLinkAction } from '../actions'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error   = searchParams.get('error')
  const message = searchParams.get('message')

  const [showPassword, setShowPassword]   = useState(false)
  const [isPending,    startTransition]   = useTransition()
  const [isMagic,      startMagicTransition] = useTransition()

  // Show toast from URL params on mount. The ref keeps Strict Mode's double
  // effect from showing everything twice in development.
  const shownToast = useRef<string | null>(null)
  useEffect(() => {
    const key = `${error ?? ''}|${message ?? ''}`
    if (key === '|' || shownToast.current === key) return
    shownToast.current = key
    if (error)   toast.error(decodeURIComponent(error))
    if (message) toast.success(decodeURIComponent(message))
  }, [error, message])

  // Where to land after signing in. An invitation link sends people here when
  // the token belongs to a different address than the open session, and losing
  // it would leave them back at the dashboard with no way to the invitation.
  const next = searchParams.get('next')

  function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (next) formData.set('next', next)
    startTransition(async () => {
      await signInAction(formData)
    })
  }

  function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    if (next) formData.set('next', next)
    startMagicTransition(async () => {
      await signInWithMagicLinkAction(formData)
      toast.success('Magic link sent! Check your inbox.')
    })
  }

  const isLoading = isPending || isMagic

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your Challenge Studio account.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Password sign-in */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye    className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
              : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>

        {/* Magic link */}
        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or
          </span>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="magic-email">Email for magic link</Label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isMagic
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              : 'Email me a sign-in link'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Get started free
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
