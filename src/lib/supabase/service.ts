import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/database.types'
import { getSupabaseEnv } from '@/lib/supabase/env'

// 서비스 롤 클라이언트. RLS 를 우회하므로 서버 사이드(크론/알림)에서만 사용한다.
// 절대 클라이언트로 노출하지 마라.
export function createSupabaseServiceClient() {
  const { url, serviceRoleKey } = getSupabaseEnv()
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.')
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
