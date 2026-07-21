import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/db/database.types'
import { getSupabaseEnv } from '@/lib/supabase/env'

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
