import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users, AlertTriangle, UserX } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator }   from '@/components/ui/separator'
import { db }          from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { acceptInvitationAction } from '@/app/(workspace)/actions'
import { signOutAction } from '@/app/(auth)/auth/actions'
import { AuthShell } from '../../../_components/auth-shell'

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

  // The token is bound to one address. Signing out first is what makes the
  // "sign in as someone else" route work at all: middleware sends an already
  // authenticated visitor away from /auth/login, so offering that link while
  // still signed in was a loop.
  async function switchAccount() {
    'use server'
    await signOutAction(`/auth/invitation/${token}`)
  }

  const wrongAccount =
    currentUser !== null &&
    currentUser.email.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <AuthShell>
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

        {wrongAccount ? (
          // ── Signed in as somebody else ──────────────────────────────────
          // Catching this here rather than in the action matters: the action
          // could only bounce them to the dashboard with an error, which left
          // the invitation unreachable and nothing to click.
          <>
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <UserX className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-amber-900">This invitation is for someone else</p>
                <p className="mt-1 text-amber-800">
                  It was sent to{' '}
                  <span className="font-medium break-all">{invitation.email}</span>, but you are
                  signed in as{' '}
                  <span className="font-medium break-all">{currentUser!.email}</span>.
                </p>
              </div>
            </div>

            <form action={switchAccount}>
              <Button type="submit" className="w-full" size="lg">
                Sign out and sign in as {invitation.email}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              Wrong address? Ask {inviterName} to send the invitation to{' '}
              <span className="font-medium text-foreground break-all">{currentUser!.email}</span> instead.
            </p>
          </>
        ) : currentUser ? (
          // ── Signed in as the invited address — show accept button ───────
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

            <form action={switchAccount}>
              <button type="submit" className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                Not you? <span className="text-primary underline-offset-2 hover:underline">Sign in with a different account</span>
              </button>
            </form>
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
              <Link href={`/auth/login?next=/auth/invitation/${token}`}>
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
              <Link href={`/auth/signup?next=/auth/invitation/${token}&email=${encodeURIComponent(invitation.email)}`}>
                Create account &amp; accept
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/auth/login?next=/auth/invitation/${token}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

      </CardContent>
      </Card>
    </AuthShell>
  )
}
