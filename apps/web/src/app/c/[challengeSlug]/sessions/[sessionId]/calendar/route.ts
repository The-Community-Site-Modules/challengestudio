// Calendar file for one live session (PRD §16: "Calendar-file download should
// be supported in MVP if feasible").
//
// Gated on enrolment for the same reason the join link is: §16 requires
// external join URLs be protected from public discovery on a private
// challenge, and the .ics carries that URL in its body.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'

interface Params {
  params: Promise<{ challengeSlug: string; sessionId: string }>
}

/** iCalendar wants UTC as YYYYMMDDTHHMMSSZ, with no punctuation. */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Long lines and stray commas/semicolons break naive parsers. */
function escape(text: string): string {
  return text.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

export async function GET(_request: Request, { params }: Params) {
  const { challengeSlug, sessionId } = await params

  const user = await getCurrentUser()
  if (!user) return new NextResponse('Not found', { status: 404 })

  const session = await db.liveSession.findUnique({
    where:  { id: sessionId },
    select: {
      title: true, description: true, startsAt: true, durationMinutes: true,
      joinUrl: true, hostName: true,
      challenge: { select: { id: true, slug: true, title: true } },
    },
  })

  // The slug in the URL must be the session's own challenge, or a session id
  // would be readable from any challenge's route.
  if (!session || session.challenge.slug !== challengeSlug) {
    return new NextResponse('Not found', { status: 404 })
  }

  const participant = await db.participant.findUnique({
    where: {
      challengeId_profileId: { challengeId: session.challenge.id, profileId: user.id },
    },
    select: { status: true },
  })
  if (!participant || participant.status === 'PENDING') {
    return new NextResponse('Not found', { status: 404 })
  }

  const end = new Date(session.startsAt.getTime() + (session.durationMinutes ?? 60) * 60_000)
  const description = [
    session.description,
    session.hostName ? `Host: ${session.hostName}` : null,
    session.joinUrl ? `Join: ${session.joinUrl}` : null,
  ].filter(Boolean).join('\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Challenge Studio//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${sessionId}@challengestudio`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(session.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(session.title)}`,
    description ? `DESCRIPTION:${escape(description)}` : null,
    session.joinUrl ? `URL:${session.joinUrl}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${session.challenge.slug}-session.ics"`,
    },
  })
}
