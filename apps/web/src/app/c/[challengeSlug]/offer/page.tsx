// Route: /c/[challengeSlug]/offer — what a finisher is pointed at next.
//
// PRD §12.2: an external CTA. Nothing here takes payment, and the button is a
// link out to whatever page the creator configured.

import { notFound } from 'next/navigation'
import { Check, Clock } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { recordOfferClickAction } from '@/app/(workspace)/ws/[workspaceSlug]/challenges/[challengeSlug]/offer/actions'
import { OfferCta } from './_components/offer-cta'

interface Props { params: Promise<{ challengeSlug: string }> }

export const metadata = { title: 'Next step — Challenge Studio' }

export default async function ParticipantOfferPage({ params }: Props) {
  const { challengeSlug } = await params

  const challenge = await db.challenge.findFirst({
    where:  { slug: challengeSlug },
    select: {
      id: true, title: true,
      workspace: { select: { name: true } },
      offer: {
        select: {
          id: true, enabled: true, headline: true, body: true,
          ctaLabel: true, ctaUrl: true, bonuses: true, closesAt: true,
        },
      },
    },
  })
  if (!challenge) notFound()

  const offer = challenge.offer
  // A disabled or unconfigured offer has no page at all, rather than an empty
  // one that looks broken.
  if (!offer || !offer.enabled) notFound()

  const closed = offer.closesAt !== null && offer.closesAt < new Date()

  // Clicks are attributed to a participant when there is one, but the page is
  // readable without a session — it is reachable after a challenge ends.
  const user = await getCurrentUser()
  let participantId: string | undefined
  if (user) {
    const p = await db.participant.findUnique({
      where:  { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
      select: { id: true },
    })
    participantId = p?.id
  }

  const bonuses = Array.isArray(offer.bonuses) ? (offer.bonuses as string[]) : []

  return (
    <div className="min-h-screen bg-slate-50/70">
      <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:py-20">

        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {challenge.workspace.name}
        </p>
        <h1 className="mt-3 text-center text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
          {offer.headline}
        </h1>
        {offer.body && (
          <p className="mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-slate-600">
            {offer.body}
          </p>
        )}

        {bonuses.length > 0 && (
          <ul className="mx-auto mt-8 max-w-md space-y-2.5 rounded-2xl border border-slate-200 bg-white p-6">
            {bonuses.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 text-center">
          {closed ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              This closed on{' '}
              {offer.closesAt!.toLocaleDateString(undefined, {
                day: 'numeric', month: 'long', year: 'numeric',
              })}.
            </p>
          ) : (
            <>
              <OfferCta
                offerId={offer.id}
                label={offer.ctaLabel}
                url={offer.ctaUrl}
                recordClick={recordOfferClickAction}
                {...(participantId ? { participantId } : {})}
              />
              {offer.closesAt && (
                <p className="mt-3 text-[13px] text-slate-500">
                  Closes{' '}
                  {offer.closesAt.toLocaleDateString(undefined, {
                    day: 'numeric', month: 'long',
                  })}.
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-10 text-center text-[13px] text-slate-400">
          Offered by {challenge.workspace.name}, who ran {challenge.title}.
        </p>
      </main>
    </div>
  )
}
