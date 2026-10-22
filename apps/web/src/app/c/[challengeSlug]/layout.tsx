import type { Metadata } from 'next'
import { headers }      from 'next/headers'
import { cache }        from 'react'
import { db }           from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/session'
import { ChallengeNav } from '@/components/participant/challenge-nav'
import { safeHttpsUrl, themeStyle } from '@/lib/branding'

interface Props {
  children: React.ReactNode
  params:   Promise<{ challengeSlug: string }>
}

// Only show ChallengeNav on participant-experience routes.
// Registration (/), confirm, access pages have their own header.
const NAV_PREFIXES = [
  '/hub', '/day/', '/feed', '/journey', '/leaderboard',
  '/welcome', '/complete', '/resources', '/sessions',
]

/**
 * The challenge and its workspace's branding, once per request.
 *
 * Both `generateMetadata` and the layout need it; `cache` makes the second
 * call free rather than a second query.
 */
const loadChallenge = cache(async (challengeSlug: string) =>
  db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true,
      workspace: {
        select: { name: true, faviconUrl: true, primaryColor: true, accentColor: true },
      },
    },
  })
)

/**
 * The workspace's icon in the browser tab.
 *
 * Only an https URL is emitted — the value came from a creator, and an icon
 * link is still a link.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { challengeSlug } = await params
  const challenge = await loadChallenge(challengeSlug)
  const icon = safeHttpsUrl(challenge?.workspace.faviconUrl)
  return icon ? { icons: { icon, apple: icon } } : {}
}

export default async function ChallengeLayout({ children, params }: Props) {
  const { challengeSlug } = await params

  // Read current pathname to decide whether to show nav
  const headersList = await headers()
  // Set by middleware. Not `referer`: that is the previous page, as an
  // absolute URL, so it never matched and the nav never showed.
  const pathname    = headersList.get('x-pathname') ?? ''

  // Determine if this request is for a nav-bearing route
  // We check the URL segment after /c/[slug]
  const slugBase  = `/c/${challengeSlug}`
  const afterSlug = pathname.replace(slugBase, '') || '/'
  const showNav   = NAV_PREFIXES.some(prefix => afterSlug.startsWith(prefix))

  const challenge = await loadChallenge(challengeSlug)

  // The workspace's colours, as the theme variables every page here is styled
  // with — so `bg-primary` on the registration button and the hub banner
  // become the creator's colour without either page knowing about branding.
  //
  // `display: contents` keeps this wrapper out of layout entirely: the pages
  // below lay themselves out as if it were not there, and custom properties
  // still inherit through it. Dialogs and menus portal to <body> and so keep
  // the platform palette — the parts that are ours, not the creator's.
  const theme = themeStyle(challenge?.workspace.primaryColor, challenge?.workspace.accentColor)
  const themed = (node: React.ReactNode) =>
    theme ? <div style={{ display: 'contents', ...theme }}>{node}</div> : <>{node}</>

  if (!showNav || !challenge) {
    // Registration page, confirm, access — no nav shell
    return themed(children)
  }

  const [postCount, user] = await Promise.all([
    db.feedPost.count({ where: { challengeId: challenge.id, isHidden: false } }),
    getCurrentUser(),
  ])

  const displayName = user?.fullName?.split(' ')[0] ?? user?.email.split('@')[0] ?? 'You'
  const initials = (user?.fullName ?? user?.email ?? '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return themed(
    <>
      <ChallengeNav
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
        hostName={challenge.workspace.name}
        postCount={postCount}
        initials={initials || '?'}
        displayName={displayName}
      />
      {children}
    </>
  )
}
