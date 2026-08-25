// Resend webhook — delivery status updates (delivered, bounced, failed)
// Updates message_deliveries table
// TODO: Milestone 13

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // TODO: Verify webhook signature from Resend
  // TODO: Parse event and update message_deliveries record
  void request

  return NextResponse.json({ received: true })
}
