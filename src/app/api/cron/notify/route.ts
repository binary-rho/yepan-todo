import { NextResponse, type NextRequest } from 'next/server'
import { runDailyDigest } from '@/lib/notifications/digest'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  const custom = request.headers.get('x-cron-secret')
  return auth === `Bearer ${secret}` || custom === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const result = await runDailyDigest()
  return NextResponse.json({ ok: true, ...result })
}
