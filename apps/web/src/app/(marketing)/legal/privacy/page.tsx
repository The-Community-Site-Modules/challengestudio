// Route: /legal/privacy
//
// Every factual claim below was read out of the codebase, not assumed:
//
//   what is collected      prisma/schema.prisma
//   cookies                src/middleware.ts and lib/supabase/* — Supabase auth
//                          session cookies only, no analytics, no advertising
//   hosting region         DATABASE_URL → aws-0-us-west-2
//   processors             Supabase, Vercel, Resend, Upstash. Fonts are NOT a
//                          processor: next/font/google downloads Inter at build
//                          time and serves it from our own domain, so a
//                          visitor's browser never contacts Google.
//   IP addresses           lib/rate-limit/caller.ts — used as a rate-limit key
//   no payments            nothing in the codebase touches a payment provider
//   no self-serve deletion there is no delete-account button yet, so the policy
//                          says to ask rather than pointing at one
//
// If any of those change, this page is wrong until it is changed too. That is
// the whole risk with a privacy policy, and why it is written from the schema
// rather than from a template.

import Link from 'next/link'
import { LEGAL } from '../_components/config'
import { LegalPage, Points, type Section } from '../_components/legal-page'

export const metadata = {
  title: 'Privacy Policy — Challenge Studio',
  description:
    'What Challenge Studio collects, why, who processes it, how long it is kept, and how to get it removed.',
}

const SECTIONS: Section[] = [
  {
    id: 'who-we-are',
    heading: 'Who we are',
    body: (
      <>
        <p>
          {LEGAL.product} is software for building and running multi-day
          challenges, operated by {LEGAL.company}. This policy covers the
          {' '}{LEGAL.product} application and its marketing website.
        </p>
        <p>
          Two kinds of person use it, and the difference matters throughout.
          A <strong className="font-semibold text-foreground">creator</strong> builds
          and runs challenges inside a workspace. A{' '}
          <strong className="font-semibold text-foreground">participant</strong> takes
          part in someone&rsquo;s challenge. For the content a participant submits
          into a challenge, the creator&rsquo;s workspace decides what happens to
          it and we act on their instructions.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    body: (
      <>
        <p>Only what the product needs to work. Specifically:</p>
        <Points
          items={[
            <>
              <strong className="font-semibold text-foreground">Your account.</strong>{' '}
              Email address, the name you give us, and an avatar image URL if you set
              one. Your password is handled by our authentication provider and is
              stored only as a hash — we never see it.
            </>,
            <>
              <strong className="font-semibold text-foreground">What you submit to a challenge.</strong>{' '}
              Written answers, assignments and reflections, and whether you marked
              each one private.
            </>,
            <>
              <strong className="font-semibold text-foreground">What you post publicly in a challenge.</strong>{' '}
              Feed posts, comments and reactions.
            </>,
            <>
              <strong className="font-semibold text-foreground">Your progress.</strong>{' '}
              Which steps you completed and when, points earned, badges awarded,
              and your streak.
            </>,
            <>
              <strong className="font-semibold text-foreground">Email we send you.</strong>{' '}
              A log of which message was sent to which address, when, and whether it
              was delivered, skipped or failed. We keep this so we can tell whether a
              message reached you and never send it twice.
            </>,
            <>
              <strong className="font-semibold text-foreground">Your notification preferences.</strong>{' '}
              Including whether you have unsubscribed from a particular workspace.
            </>,
            <>
              <strong className="font-semibold text-foreground">IP addresses, briefly.</strong>{' '}
              Used as a counter key to rate-limit registration forms and sign-in
              attempts. It is not attached to your account and is discarded when the
              time window passes — see <a href="#cookies" className="text-primary underline underline-offset-2 hover:no-underline">Cookies and rate limiting</a>.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'what-we-do-not-collect',
    heading: 'What we do not collect',
    body: (
      <>
        <p>
          Stating this plainly is more useful than leaving it to be inferred:
        </p>
        <Points
          items={[
            <>
              <strong className="font-semibold text-foreground">No payment details.</strong>{' '}
              {LEGAL.product} does not process payments at all. A paid challenge
              checks an entitlement the creator grants elsewhere; card details never
              reach us because there is nothing here to reach.
            </>,
            <>
              <strong className="font-semibold text-foreground">No advertising or tracking.</strong>{' '}
              No advertising network, no analytics script, no tracking pixel, and no
              cross-site profiling. The application sets no cookie other than the one
              that keeps you signed in.
            </>,
            <>
              <strong className="font-semibold text-foreground">No sale of your data.</strong>{' '}
              We do not sell, rent or trade personal information, and we do not share
              it for anyone else&rsquo;s advertising.
            </>,
            <>
              <strong className="font-semibold text-foreground">No file uploads yet.</strong>{' '}
              Uploading files to a challenge is not available, so no documents or
              images of yours are stored.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: 'private-submissions',
    heading: 'Private submissions',
    body: (
      <>
        <p>
          Some challenge steps let you mark an answer private. When you do, that
          answer is withheld on the server: other participants cannot see it, and
          within the creator&rsquo;s team only members whose role includes permission
          to view private submissions can open it.
        </p>
        <p>
          The creator&rsquo;s participant export also excludes it. The export
          contains counts, dates and progress — it never contains the text of any
          submission, private or otherwise.
        </p>
        <p>
          Two honest limits. The creator, as the workspace owner, can grant that
          permission to their own team members, and we have no way to know who they
          trust. And private means private from other participants and from
          unauthorised team members — not encrypted such that we could not read it
          if legally compelled.
        </p>
      </>
    ),
  },
  {
    id: 'why-we-use-it',
    heading: 'Why we use it',
    body: (
      <Points
        items={[
          <>To let you sign in and keep you signed in.</>,
          <>To run the challenge — unlock the right day, record what you finished, and show your progress.</>,
          <>To send the challenge email you would expect: confirmations, a nudge when a day opens, feedback on your work.</>,
          <>To show creators how their challenge is going, in aggregate and per participant.</>,
          <>To keep the service standing up — rate limits against spam and abuse, and error logs to fix faults.</>,
        ]}
      />
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies and rate limiting',
    body: (
      <>
        <p>
          {LEGAL.product} sets <strong className="font-semibold text-foreground">one kind of cookie</strong>:
          the session cookie issued by our authentication provider, which is what
          keeps you signed in between page loads. It is necessary for the
          application to function and cannot be switched off while you are using
          your account.
        </p>
        <p>
          There are no analytics, advertising or preference cookies, which is why
          you will not find a cookie banner — there is nothing to consent to.
        </p>
        <p>
          Separately, the public registration form and the sign-in page count
          attempts per IP address so that neither can be flooded. Those counts hold
          an address and a timestamp, are not linked to any account, and expire on
          their own — within fifteen minutes for sign-in attempts and an hour for
          registrations.
        </p>
        <p>
          Fonts are served from our own domain rather than fetched from a font
          network, so loading a page does not disclose your address to a third
          party for that purpose.
        </p>
      </>
    ),
  },
  {
    id: 'processors',
    heading: 'Who else processes it',
    body: (
      <>
        <p>
          We use a small number of service providers, each handling data only on
          our instructions:
        </p>
        <Points
          items={[
            <>
              <strong className="font-semibold text-foreground">Supabase</strong> —
              database and authentication. This is where your account and challenge
              data live, in {LEGAL.hostingRegion}.
            </>,
            <>
              <strong className="font-semibold text-foreground">Vercel</strong> —
              application hosting and delivery.
            </>,
            <>
              <strong className="font-semibold text-foreground">Resend</strong> —
              sending transactional email. Receives the recipient address and the
              message.
            </>,
            <>
              <strong className="font-semibold text-foreground">Upstash</strong> —
              shared counters for the rate limits described above, where configured.
            </>,
          ]}
        />
        <p>
          One thing worth flagging, because it is not obvious: if a creator embeds a
          video from YouTube or Vimeo into a challenge day, your browser contacts
          that service directly when the page loads, and their own privacy terms
          apply to that request. We do not send them anything about you, and we
          cannot control what they collect.
        </p>
      </>
    ),
  },
  {
    id: 'where-it-is-held',
    heading: 'Where it is held',
    body: (
      <p>
        Your data is stored in {LEGAL.hostingRegion}. If you are in the United
        Kingdom, the European Economic Area or another region with data transfer
        rules, using {LEGAL.product} involves a transfer of your information to the
        United States. We rely on standard contractual clauses with our providers
        for that transfer.
      </p>
    ),
  },
  {
    id: 'how-long',
    heading: 'How long we keep it',
    body: (
      <Points
        items={[
          <>
            <strong className="font-semibold text-foreground">Your account</strong> — until
            you ask us to delete it.
          </>,
          <>
            <strong className="font-semibold text-foreground">Challenge content and progress</strong> — for
            as long as the creator&rsquo;s workspace exists. If they delete the
            challenge or the workspace, it goes with it.
          </>,
          <>
            <strong className="font-semibold text-foreground">The email delivery log</strong> — kept
            while your account exists, because it is what stops a message being sent
            to you twice and lets us answer whether something reached you.
          </>,
          <>
            <strong className="font-semibold text-foreground">Rate-limit counters</strong> — minutes
            to an hour, then gone.
          </>,
        ]}
      />
    ),
  },
  {
    id: 'your-rights',
    heading: 'Your rights',
    body: (
      <>
        <p>You can ask us to:</p>
        <Points
          items={[
            <>tell you what we hold about you, and give you a copy;</>,
            <>correct anything that is wrong;</>,
            <>delete your account and the data attached to it;</>,
            <>stop sending you challenge email — you can also do this yourself, per workspace, in your notification settings.</>,
          ]}
        />
        <p>
          Email{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.privacyEmail}
          </a>{' '}
          and we will respond within 30 days.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Deletion, honestly:</strong>{' '}
          there is not yet a button in the product that deletes your account, so for
          now it is a request to us rather than something you can do yourself. When
          we delete your account, the workspaces you own and the records attached to
          them are removed with it. Content you posted into someone else&rsquo;s
          challenge is removed too; what may remain is the fact that a participant
          completed a step, inside that creator&rsquo;s aggregate figures, with no
          link to you.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    heading: 'Children',
    body: (
      <p>
        {LEGAL.product} is not directed at children under 13, and we do not
        knowingly collect their information. A creator running a challenge for
        under-16s is responsible for obtaining whatever consent their own
        jurisdiction requires. If you believe a child has given us information,
        write to{' '}
        <a href={`mailto:${LEGAL.privacyEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
          {LEGAL.privacyEmail}
        </a>{' '}
        and we will remove it.
      </p>
    ),
  },
  {
    id: 'security',
    heading: 'Security',
    body: (
      <>
        <p>
          Every request is served over HTTPS. Passwords are stored as hashes by our
          authentication provider. Access between workspaces is separated in the
          application and that separation is covered by automated tests, including
          tests that sign in as one customer and attempt to reach another&rsquo;s
          data.
        </p>
        <p>
          No system is perfectly secure, and we would rather say so than imply
          otherwise. If you find a vulnerability, please report it to{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.contactEmail}
          </a>{' '}
          before disclosing it publicly.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    heading: 'Changes to this policy',
    body: (
      <p>
        {LEGAL.product} is in beta and still changing. If we start collecting
        something new, or add a provider that handles your data, we will update this
        page and change the effective date at the top. Where the change is
        significant we will email you before it takes effect rather than relying on
        you to re-read this page.
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
          Privacy:{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.privacyEmail}
          </a>
          <br />
          Everything else:{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            {LEGAL.contactEmail}
          </a>
        </p>
        <p>
          See also our{' '}
          <Link href="/legal/terms" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
            Terms of Service
          </Link>
          .
        </p>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          <p>
            This explains what {LEGAL.product} collects, why, who else handles it,
            and how to get it removed. It is written to be specific rather than
            broad — every claim here describes what the software actually does.
          </p>
          <p className="text-muted-foreground">
            The short version: we collect what running a challenge requires, we set
            one cookie and it keeps you signed in, we use no advertising or
            analytics trackers, and we never sell anything about you.
          </p>
        </>
      }
      sections={SECTIONS}
    />
  )
}
