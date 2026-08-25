import Link from 'next/link'
import { CheckCircle, Mail, Calendar, Share2 } from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Badge }   from '@/components/ui/badge'
import { db }      from '@/lib/db'

interface Props {
  params:       Promise<{ challengeSlug: string }>
  searchParams: Promise<{ email?: string; name?: string }>
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { challengeSlug }      = await params
  const { email = '', name = '' } = await searchParams

  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      title: true, startsAt: true,
      workspace: { select: { name: true } },
    },
  })

  const startDate = challenge?.startsAt
    ? challenge.startsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const displayName = name ? decodeURIComponent(name) : 'there'
  const displayEmail = email ? decodeURIComponent(email) : null

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">

        {/* Success card */}
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <Badge variant="success" className="mb-2">You&apos;re registered!</Badge>
            <h1 className="text-2xl font-extrabold text-foreground">
              Welcome, {displayName}! 🎉
            </h1>
            <p className="mt-2 text-muted-foreground">
              You&apos;re registered for{' '}
              <strong>{challenge?.title ?? challengeSlug}</strong>.
            </p>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-bold text-foreground">What happens next</h2>
          <div className="space-y-3">

            {displayEmail && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Check your inbox</p>
                  <p className="text-xs text-muted-foreground">
                    We sent a magic link to <strong>{displayEmail}</strong>.
                    Click it to verify your account and access the challenge.
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Check your spam folder if it doesn&apos;t arrive within a minute.
                  </div>
                </div>
              </div>
            )}

            {startDate && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Day 1 unlocks on {startDate}</p>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll get an email reminder when the challenge begins.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{startDate ? '3' : '2'}</div>
              <div>
                <p className="text-sm font-medium text-foreground">Show up every day</p>
                <p className="text-xs text-muted-foreground">
                  30–45 minutes of focused work each day. That&apos;s it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1 gap-2">
            <Link href={`/c/${challengeSlug}/hub`}>
              <Calendar className="h-4 w-4" /> Go to challenge hub
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 gap-2" asChild>
            <Link href={`/c/${challengeSlug}?share=1`}>
              <Share2 className="h-4 w-4" /> Share this challenge
            </Link>
          </Button>
        </div>

      </div>
    </div>
  )
}
