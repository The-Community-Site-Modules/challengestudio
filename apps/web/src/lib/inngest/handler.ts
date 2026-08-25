// Inngest handler — placeholder until OD-4 (Inngest credentials)
// Real functions registered in Milestone 8

import { NextResponse } from 'next/server'

export const GET  = () => NextResponse.json({ error: 'Inngest not configured' }, { status: 501 })
export const POST = () => NextResponse.json({ error: 'Inngest not configured' }, { status: 501 })
export const PUT  = () => NextResponse.json({ error: 'Inngest not configured' }, { status: 501 })
