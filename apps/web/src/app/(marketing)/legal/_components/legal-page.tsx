/**
 * Shared chrome for the two legal documents.
 *
 * These pages are read in two quite different moods: skimmed by someone
 * deciding whether to sign up, and searched by someone looking for one
 * specific answer. So there is a contents list that jumps, headings that are
 * linkable, and enough line height to survive being read properly.
 *
 * No prose plugin — the typography is set here so both documents match and
 * neither depends on a dependency for its readability.
 */

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { LEGAL } from './config'

export interface Section {
  id: string
  heading: string
  body: React.ReactNode
}

export function LegalPage({
  title, intro, sections,
}: {
  title: string
  intro: React.ReactNode
  sections: Section[]
}) {
  return (
    <main>
      {/* Header */}
      <div className="border-b border-border bg-muted/25">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-14">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-[34px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {LEGAL.product} by {LEGAL.company} · Effective {LEGAL.effectiveDate}
          </p>
          <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-foreground">
            {intro}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Contents */}
        <nav aria-label="Contents" className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Contents
          </p>
          <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id} className="flex gap-2 text-[13px]">
                <span className="w-4 shrink-0 tabular-nums text-muted-foreground">{i + 1}.</span>
                <a
                  href={`#${section.id}`}
                  className="text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Body */}
        <div className="mt-10 space-y-10">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-[19px] font-bold tracking-tight text-foreground">
                <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                {section.heading}
              </h2>
              <div className="legal-body mt-3 space-y-3 text-[15px] leading-[1.7] text-muted-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-14 border-t border-border pt-7">
          <p className="text-sm text-muted-foreground">
            Questions about this document? Email{' '}
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              {LEGAL.contactEmail}
            </a>
            .
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <span className="mx-2">·</span>
            <Link href="/legal/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
            <span className="mx-2">·</span>
            <Link href="/" className="hover:text-foreground hover:underline">
              Back to {LEGAL.product}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

/** A term and its definition, used in both documents. */
export function Defined({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p>
      <strong className="font-semibold text-foreground">{term}</strong> {children}
    </p>
  )
}

/** A bulleted list with the spacing the rest of the page uses. */
export function Points({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
