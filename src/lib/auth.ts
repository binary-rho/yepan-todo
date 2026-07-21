import { redirect } from 'next/navigation'
import type { User } from '@/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { mapUser } from '@/lib/db/mappers'

export async function getCurrentUser(): Promise<User | null> {
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
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/')
  return user
}
