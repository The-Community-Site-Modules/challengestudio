// Community Site integration — launch token callback
// Validates signed JWT from Community Site, creates/links user session
// PRD §20.4 — token expiry, replay protection, tenant binding required
// TODO: Milestone 15

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  void request
  return NextResponse.json(
    { error: 'Launch endpoint not yet implemented' },
    { status: 501 }
  )
}
