import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/db/database.types'

// 클라이언트 컴포넌트에서 사용하는 브라우저 클라이언트.
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
