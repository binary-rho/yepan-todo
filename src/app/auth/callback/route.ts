import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return ''
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNext(searchParams.get('next'))
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = createSupabaseServerClient()

  let authError = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = !!error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authError = !!error
  } else {
    authError = true
  }

  if (authError) {
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // next 가 없으면 역할에 따라 기본 경로로 보낸다.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let destination = '/'
  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    destination = data?.role === 'admin' ? '/board' : '/'
  }
  return NextResponse.redirect(`${origin}${destination}`)
}
