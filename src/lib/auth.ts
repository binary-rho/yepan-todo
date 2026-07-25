import type { User } from '@/types'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { mapUser } from '@/lib/db/mappers'
import { PROFILE_USER_ID } from '@/lib/profile'

// 로그인은 제거됐다. 앱은 users 테이블의 단일 운영자 프로필(PROFILE_USER_ID)을 "현재 사용자"로 사용한다.
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase.from('users').select('*').eq('id', PROFILE_USER_ID).maybeSingle()
  return data ? mapUser(data) : null
}

// 프로필 행이 반드시 존재해야 한다(시드 또는 마이그레이션으로 보장). 없으면 설정 오류다.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error('운영자 프로필이 설정되지 않았습니다. seed.sql 또는 0005 마이그레이션을 실행해주세요.')
  return user
}
