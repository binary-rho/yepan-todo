import { redirect } from 'next/navigation'
import type { User } from '@/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { mapUser } from '@/lib/db/mappers'
import { AUTH_BYPASS, BYPASS_USER_ID } from '@/lib/dev-bypass'

export async function getCurrentUser(): Promise<User | null> {
  // 로그인 우회 모드: 실제 세션 없이 시드 사용자로 접근한다.
  if (AUTH_BYPASS) {
    const supabase = createSupabaseServiceClient()
    const { data } = await supabase.from('users').select('*').eq('id', BYPASS_USER_ID).single()
    return data ? mapUser(data) : null
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // 사전 등록된 users 프로필이 있어야만 유효한 로그인으로 인정한다.
  const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!data) return null
  return mapUser(data)
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  // 로그인 검사: 우회 모드에선 getCurrentUser 가 시드 사용자를 돌려주므로 통과한다.
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/')
  return user
}
