import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, AlertTriangle } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator }   from '@/components/ui/separator'
import { db }          from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { acceptInvitationAction } from '@/app/(workspace)/actions'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params

  // Lookup invitation by token
  const invitation = await db.workspaceInvitation.findUnique({
    where: { token },
    include: {
      workspace: { select: { name: true, slug: true } },
      invitedBy: { select: { fullName: true, email: true } },
    },
  })

  // Token not found or already accepted
  if (!invitation) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Invalid invitation</CardTitle>
          <CardDescription>
            This invitation link is invalid or has already been used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            ← Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Expired
  const isExpired = invitation.expiresAt < new Date()
  if (isExpired) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Invitation expired</CardTitle>
          <CardDescription>
            This invitation to{' '}
            <span className="font-medium text-foreground">{invitation.workspace.name}</span>
            {' '}expired on {invitation.expiresAt.toLocaleDateString()}.
            Ask the workspace owner to send a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            ← Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Already accepted — redirect straight to workspace
  if (invitation.acceptedAt) {
    redirect(`/ws/${invitation.workspace.slug}`)
  }

  // Get current session (if any)
  const currentUser = await getCurrentUser()

  const inviterName = invitation.invitedBy.fullName ?? invitation.invitedBy.email

  // Accept action bound with token
  async function accept() {
    'use server'
    await acceptInvitationAction(token)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">You&apos;re invited!</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{inviterName}</span>
          {' '}has invited you to join{' '}
          <span className="font-medium text-foreground">{invitation.workspace.name}</span>
          {' '}as <span className="font-medium text-foreground capitalize">{invitation.role.toLowerCase()}</span>.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {currentUser ? (
          // ── Signed in — show accept button ──────────────────────────────
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Accepting as</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {currentUser.fullName
                  ? `${currentUser.fullName} (${currentUser.email})`
                  : currentUser.email}
              </p>
            </div>

            <form action={accept}>
              <Button type="submit" className="w-full" size="lg">
                Accept invitation → Join {invitation.workspace.name}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Not you?{' '}
              <Link
                href={`/auth/login?callbackUrl=/auth/invitation/${token}`}
                className="text-primary hover:underline"
              >
                Sign in with a different account
              </Link>
            </p>
          </>
        ) : (
          // ── Not signed in — sign in or create account ───────────────────
          <>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              You&apos;re invited to join as{' '}
              <span className="font-medium text-foreground">{invitation.email}</span>.
              Sign in or create an account to accept.
            </div>

            <Button asChild className="w-full" size="lg">
              <Link href={`/auth/login?callbackUrl=/auth/invitation/${token}`}>
                Sign in to accept
              </Link>
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href={`/auth/signup?callbackUrl=/auth/invitation/${token}&email=${encodeURIComponent(invitation.email)}`}>
                Create account &amp; accept
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/auth/login?callbackUrl=/auth/invitation/${token}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

      </CardContent>
    </Card>
  )
}
