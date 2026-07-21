import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/db/database.types'
import { AUTH_BYPASS } from '@/lib/dev-bypass'

const PUBLIC_PREFIXES = ['/login', '/auth']

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  // 로그인 우회 모드: 라우트 보호(미로그인 리다이렉트)를 하지 않고 그대로 통과시킨다.
  if (AUTH_BYPASS) return supabaseResponse

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // 환경 변수가 없으면(초기 세팅 전) 통과시킨다.
  if (!url || !anonKey) return supabaseResponse

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone()
    const target = path + request.nextUrl.search
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('redirect', target)
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}
