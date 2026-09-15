// Route: /legal/terms
//
// Written against what the product actually is today, which keeps it short and
// honest:
//
//   free beta            no billing exists, so there are no payment terms to
//                        write — and a promise not to start charging without
//                        notice is one we can actually keep
//   no payment processing a paid challenge checks an entitlement granted
//                        elsewhere, so we are not a party to that transaction
//   creator owns content the workspace owns its challenges; participants own
//                        what they submit
//   limits are real      the plan limits on /pricing are not live yet, so this
//                        does not pretend they are enforced
//
// The one value here that is a legal fact rather than a product fact is the
// governing law, and it is flagged in _components/config.ts. Confirm it.

import Link from 'next/link'
import { LEGAL } from '../_components/config'
import { LegalPage, Points, type Section } from '../_components/legal-page'

export const metadata = {
  title: 'Terms of Service — Challenge Studio',
  description:
    'The agreement for using Challenge Studio: what you may do, what we owe you, who owns what, and how either side can end it.',
}

const SECTIONS: Section[] = [
  {
    id: 'agreement',
    heading: 'The agreement',
    body: (
      <>
        <p>
          These terms are between you and {LEGAL.company}, and they govern your use
          of {LEGAL.product}. By creating an account you accept them. If you do not,
          do not create one.
        </p>
        <p>
          If you accept these terms for an organisation, you are confirming you have
          authority to bind it, and &ldquo;you&rdquo; means that organisation.
        </p>
      </>
    ),
  },
  {
    id: 'the-service',
    heading: 'What the service is',
    body: (
      <>
        <p>
          {LEGAL.product} lets you build multi-day challenges, publish a
          registration page, run the challenge, and see how it went. A{' '}
          <strong className="font-semibold text-foreground">workspace</strong> holds
          your challenges, your team and your branding. A{' '}
          <strong className="font-semibold text-foreground">participant</strong> is
          someone who registers for a challenge you run.
        </p>
        <p>
          {LEGAL.product} is currently in beta. It works, it is in active
          development, and features may change. We will not remove something you
          depend on without telling you.
        </p>
      </>
    ),
  },
  {
    id: 'your-account',
    heading: 'Your account',
    body: (
      <Points
        items={[
          <>You must be 13 or older, and old enough to enter a contract where you live.</>,
          <>Give us an email address you can actually receive mail at — we use it for account recovery and for anything important.</>,
          <>Keep your password to yourself. Anything done with your account is treated as done by you.</>,
          <>Tell us promptly if you think someone else has got in.</>,
          <>One person per account. Team members get their own accounts and their own roles, which is also how you keep control of who can see what.</>,
        ]}
      />
    ),
  },
  {
    id: 'price',
    heading: 'What it costs',
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">Nothing, at present.</strong>{' '}
          {LEGAL.product} is free while it is in beta. There is no billing in the
          product, no card on file, and no trial that quietly ends.
        </p>
        <p>
          The plans shown on our{' '}
          <Link href="/pricing" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            pricing page
          </Link>{' '}
          describe what pricing is expected to look like. They are not in force, and
          the limits listed there are not currently applied to your account.
        </p>
        <p>
          When pricing does arrive: we will email you first, you will keep
          everything you have built, and you will not find a paywall placed in front
          of your own challenges. If you decide not to pay, you will be able to
          export your participants and their progress.
        </p>
      </>
    ),
  },
  {
    id: 'payments-we-do-not-take',
    heading: 'Payments between you and your participants',
    body: (
      <>
        <p>
          If you charge for a challenge, that transaction is between you and your
          participant. {LEGAL.product} does not process payments and takes no share
          of what you charge — a paid challenge simply checks an entitlement you
          have granted through your own checkout.
        </p>
        <p>
          Which means the obligations that come with taking money are yours: tax,
          refunds, receipts, chargebacks, consumer rights and delivering what you
          promised. We are not a party to it and cannot resolve a dispute about it.
        </p>
      </>
    ),
  },
  {
    id: 'your-content',
    heading: 'Who owns what',
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">You own your content.</strong>{' '}
          Your challenges, the material you put in them, your branding, and your
          participant records remain yours. We claim no ownership.
        </p>
        <p>
          You grant us only the licence we need to run the service: to store your
          content, show it to the participants and team members you have given
          access, and back it up. Nothing broader, and it ends when you delete the
          content or your account.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Participants own what they submit.</strong>{' '}
          As the creator you may read it, review it and report on it inside your
          workspace. You may not publish it elsewhere, sell it, or use it in
          marketing without that person&rsquo;s permission — and where a submission
          was marked private, treat it as written for you alone.
        </p>
        <p>
          <strong className="font-semibold text-foreground">We own the software.</strong>{' '}
          {LEGAL.product} itself, its code, design and name stay ours.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    heading: 'What you may not do',
    body: (
      <>
        <p>Do not use {LEGAL.product} to:</p>
        <Points
          items={[
            <>break the law, or help anyone else to;</>,
            <>publish content that is unlawful, harassing, hateful, or sexual content involving minors;</>,
            <>infringe someone else&rsquo;s copyright, trademark or privacy;</>,
            <>send spam, or register people who did not ask to be registered;</>,
            <>mislead participants about what your challenge is or who is running it;</>,
            <>impersonate another person or organisation, including us;</>,
            <>attempt to reach another workspace&rsquo;s data, probe for vulnerabilities without permission, or work around a rate limit or permission check;</>,
            <>scrape the service, or resell it as your own product.</>,
          ]}
        />
        <p>
          Security research is welcome — write to{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.contactEmail}
          </a>{' '}
          and tell us what you found before telling anyone else.
        </p>
      </>
    ),
  },
  {
    id: 'your-participants',
    heading: 'Your responsibilities to your participants',
    body: (
      <>
        <p>
          When you run a challenge you decide what happens to the personal
          information your participants give you, and we handle it on your
          instructions. That makes some things yours to get right:
        </p>
        <Points
          items={[
            <>having a lawful basis to contact the people you register;</>,
            <>telling them what you will do with what they submit;</>,
            <>honouring their requests to be removed, and passing them to us where we need to act;</>,
            <>not exporting their submissions or details for a purpose they would not expect;</>,
            <>whatever consent your own jurisdiction requires if your participants are children.</>,
          ]}
        />
        <p>
          Our own handling of that data is described in the{' '}
          <Link href="/legal/privacy" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    heading: 'Availability',
    body: (
      <>
        <p>
          We work to keep {LEGAL.product} available and will give notice of planned
          maintenance where we can. During beta we do not offer an uptime guarantee
          or a service credit, and we would rather say that than promise a number we
          have not yet earned the right to promise.
        </p>
        <p>
          Practical advice, meant sincerely: if a challenge matters, export your
          participants before it starts. The export is free and always available.
        </p>
      </>
    ),
  },
  {
    id: 'suspension',
    heading: 'Suspension and termination',
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">You can leave whenever you like.</strong>{' '}
          Ask us to close your account and we will delete it and its workspaces. Export
          anything you want to keep first.
        </p>
        <p>
          We may suspend or close an account that breaks the acceptable-use section
          above, or where we are legally required to. Except where the breach is
          serious or unlawful, we will tell you what the problem is and give you a
          chance to fix it before acting.
        </p>
        <p>
          If we ever discontinue {LEGAL.product}, we will give at least 30 days&rsquo;
          notice and keep the export working throughout.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimers',
    heading: 'Disclaimers',
    body: (
      <>
        <p>
          {LEGAL.product} is provided as it is. To the extent the law allows, we make
          no warranty that it will be uninterrupted, error-free, or fit for a
          particular purpose.
        </p>
        <p>
          We do not promise your challenge will succeed. How many people register,
          how many finish, and what they achieve depend on your challenge and your
          audience, not on us.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    heading: 'Limitation of liability',
    body: (
      <>
        <p>
          To the extent the law allows, neither party is liable for indirect or
          consequential loss — lost profit, lost revenue, lost data or lost
          goodwill.
        </p>
        <p>
          Our total liability to you for any claim is limited to the greater of the
          amount you paid us in the twelve months before it arose, or US$100. While
          {' '}{LEGAL.product} is free, that means US$100.
        </p>
        <p>
          Nothing here excludes liability that cannot lawfully be excluded,
          including for death or personal injury caused by negligence, or for fraud.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to these terms',
    body: (
      <p>
        We may update these terms as the product develops. The effective date at
        the top will change, and for anything significant — pricing, your rights, or
        how we may use your content — we will email you at least 30 days before it
        takes effect. Continuing to use {LEGAL.product} after that date means you
        accept the new terms; if you would rather not, close your account and take
        your data with you.
      </p>
    ),
  },
  {
    id: 'law',
    heading: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of {LEGAL.jurisdiction}, without regard
        to its conflict-of-laws rules. Where a dispute must go to court, it goes to
        the courts of that jurisdiction — though we would much rather you emailed us
        first and gave us the chance to put it right.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Contact',
    body: (
      <>
        <p>
          {LEGAL.company}
          <br />
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.contactEmail}
          </a>
        </p>
        <p>
          See also our{' '}
          <Link href="/legal/privacy" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          <p>
            The agreement for using {LEGAL.product}: what you may do with it, what
            we owe you, who owns what, and how either of us can end it.
          </p>
          <p className="text-muted-foreground">
            The short version: it is free during beta, you own your challenges and
            your participants own what they submit, we take no cut of anything you
            charge, and you can export your data and leave at any time.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
