'use client'

import { useTransition } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  offerId: string
  label: string
  url: string
  recordClick: (offerId: string) => Promise<{ success: boolean }>
}

/**
 * The button out to the creator's own page.
 *
 * It is a real link, not a button that navigates: middle-click, open in a new
 * tab and copy-link all keep working, and the click still records because the
 * default is not prevented. Recording is fire-and-forget — a failed count must
 * never stand between someone and the page they asked for.
 */
export function OfferCta({ offerId, label, url, recordClick }: Props) {
  const [, start] = useTransition()

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => { start(async () => { await recordClick(offerId) }) }}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-[15px] font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  )
}
