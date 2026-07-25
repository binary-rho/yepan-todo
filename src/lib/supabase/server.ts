import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/database.types'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// 서버 컴포넌트 / Server Action / Route Handler 에서 사용하는 세션 인식 클라이언트.
export function createSupabaseServerClient() {
  const cookieStore = cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // 서버 컴포넌트에서 호출되면 set 이 막힌다. 미들웨어에서 세션을 갱신하므로 무시한다.
        }
      },
    },
  })
}

// 데이터 조회/쓰기용 클라이언트. 로그인이 없으므로 항상 서비스 롤(RLS 우회)을 사용한다.
export function createSupabaseDbClient(): SupabaseClient<Database> {
  return createSupabaseServiceClient()
}
