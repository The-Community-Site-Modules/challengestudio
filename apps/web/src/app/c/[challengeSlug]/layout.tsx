import { headers }      from 'next/headers'
import { db }           from '@/lib/db'
import { ChallengeNav } from '@/components/participant/challenge-nav'

interface Props {
  children: React.ReactNode
  params:   Promise<{ challengeSlug: string }>
}

// Only show ChallengeNav on participant-experience routes.
// Registration (/), confirm, access pages have their own header.
const NAV_PREFIXES = ['/hub', '/day/', '/feed', '/leaderboard', '/welcome', '/complete', '/resources', '/sessions']

export default async function ChallengeLayout({ children, params }: Props) {
  const { challengeSlug } = await params

  // Read current pathname to decide whether to show nav
  const headersList = await headers()
  const pathname    = headersList.get('x-pathname') ?? headersList.get('referer') ?? ''

  // Determine if this request is for a nav-bearing route
  // We check the URL segment after /c/[slug]
  const slugBase  = `/c/${challengeSlug}`
  const afterSlug = pathname.replace(slugBase, '') || '/'
  const showNav   = NAV_PREFIXES.some(prefix => afterSlug.startsWith(prefix))

  if (!showNav) {
    // Registration page, confirm, access — no nav shell
    return <>{children}</>
  }

  // Load challenge for nav title + host
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true,
      workspace: { select: { name: true } },
    },
  })

  if (!challenge) return <>{children}</>

  return (
    <>
      <ChallengeNav
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
        hostName={challenge.workspace.name}
      />
      {children}
    </>
  )
}
