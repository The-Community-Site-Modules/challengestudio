// Route: .../challenges/[challengeSlug]/offer — PRD §12.2.
//
// External CTA only. §12.2 is explicit that native checkout waits until
// billing, Stripe architecture, taxes and refunds are separately designed, so
// nothing here takes payment — it configures a link out and counts the clicks.

import { notFound } from 'next/navigation'
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar'
import { PageHeader } from '@/components/shared/page-header'
import { requireWorkspaceMember } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { OfferClient } from './_components/offer-client'
import type { OfferInput } from './actions'

interface Props {
  params: Promise<{ workspaceSlug: string; challengeSlug: string }>
}

export const metadata = { title: 'Offer — Challenge Studio' }

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function forInput(d: Date | null): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default async function OfferPage({ params }: Props) {
  const { workspaceSlug, challengeSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: {
      id: true, title: true,
      offer: {
        select: {
          id: true, enabled: true, headline: true, body: true, ctaLabel: true,
          ctaUrl: true, bonuses: true, closesAt: true,
          _count: { select: { clicks: true } },
        },
      },
    },
  })
  if (!challenge) notFound()

  const offer = challenge.offer
  const bonuses = Array.isArray(offer?.bonuses) ? (offer.bonuses as string[]) : []

  const initial: OfferInput = {
    enabled:  offer?.enabled ?? false,
    headline: offer?.headline ?? '',
    body:     offer?.body ?? '',
    ctaLabel: offer?.ctaLabel ?? '',
    ctaUrl:   offer?.ctaUrl ?? '',
    bonuses:  bonuses.join('\n'),
    closesAt: forInput(offer?.closesAt ?? null),
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      <WorkspaceSidebar
        workspaceSlug={workspaceSlug}
        workspaceName={workspace.name}
        challengeSlug={challengeSlug}
        challengeTitle={challenge.title}
      />

      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="mx-auto w-full max-w-[820px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
          <PageHeader
            title="Offer"
            description="What you point finishers at next. A link to your own page — nothing here takes payment."
          />
          <OfferClient
            workspaceSlug={workspaceSlug}
            challengeSlug={challengeSlug}
            initial={initial}
            clicks={offer?._count.clicks ?? 0}
          />
        </div>
      </main>
    </div>
  )
}
