import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@/types'
import { users } from '@/lib/mock-data'

// TODO(supabase): 인증 단계에서 Supabase Auth 세션 기반으로 교체한다.
// 컴포넌트/페이지가 의존하는 시그니처(getCurrentUser / requireUser)는 유지한다.
export const DEV_SESSION_COOKIE = 'dev_user_id'

export async function getCurrentUser(): Promise<User | null> {
  const userId = cookies().get(DEV_SESSION_COOKIE)?.value
  if (!userId) return null
  return users.find((u) => u.id === userId) ?? null
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
