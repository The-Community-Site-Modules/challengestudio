// Community Site integration — health check endpoint
// TODO: Milestone 15

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', version: '1' })
}
