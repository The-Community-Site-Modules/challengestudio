import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { resendVerificationAction } from '../actions'

interface Props {
  searchParams: Promise<{ email?: string; error?: string; message?: string }>
}

export default async function VerifyPage({ searchParams }: Props) {
  const { email, error, message } = await searchParams

  return (
    <Card className="shadow-sm text-center">
      <CardHeader className="space-y-1 pb-4">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to{' '}
          {email ? (
            <span className="font-medium text-foreground">{decodeURIComponent(email)}</span>
          ) : (
            'your email address'
          )}
          . Click the link to activate your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {decodeURIComponent(error)}
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            {decodeURIComponent(message)}
          </div>
        )}

        {/* Inbox hint */}
        <div className="rounded-lg bg-muted/50 p-4 text-left">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Check your{' '}
            <strong>spam or promotions</strong> folder if you don&apos;t see it within a minute.
          </p>
        </div>

        {/* Resend form */}
        <form action={resendVerificationAction}>
          {/* Pass email through so resend knows who to send to */}
          <input type="hidden" name="email" value={email ?? ''} />
          <Button type="submit" variant="outline" className="w-full" disabled={!email}>
            Resend verification email
          </Button>
        </form>

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  )
}
