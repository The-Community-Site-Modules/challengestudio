'use client'

import { useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { forgotPasswordAction } from '../actions'
import { AuthShell } from '../../_components/auth-shell'

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const sent  = searchParams.get('sent')

  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (error) toast.error(decodeURIComponent(error))
    if (sent)  toast.success('Reset link sent! Check your inbox.')
  }, [error, sent])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await forgotPasswordAction(formData)
    })
  }

  return (
    <AuthShell>
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {sent ? (
            /* Success state */
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Check your inbox!</p>
                <p className="mt-1 text-sm text-green-700">
                  We sent a password reset link to your email address.
                  It expires in 1 hour.
                </p>
              </div>
              <p className="text-xs text-green-600">
                Didn&apos;t receive it? Check spam, or{' '}
                <button
                  onClick={() => window.location.href = '/auth/forgot-password'}
                  className="underline hover:text-green-800"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
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

              <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                {isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending reset link…</>
                  : 'Send reset link'}
              </Button>
            </form>
          )}

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
