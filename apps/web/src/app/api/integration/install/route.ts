// Community Site integration — installation handshake (server-to-server)
// Validates HMAC signature, creates integration record, returns installation ID
// PRD §20.4 — browser-supplied IDs never trusted
// TODO: Milestone 15 (Integration Readiness)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // TODO: Verify HMAC-SHA256 signature
  // TODO: Check nonce for replay prevention
  // TODO: Create integrations record
  void request

  return NextResponse.json(
    { error: 'Integration endpoint not yet implemented' },
    { status: 501 }
  )
}
