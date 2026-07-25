'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@/types'

// 로그인이 없으므로 "지금 이 브라우저를 쓰는 사람이 누구인지"를 로컬에 기억해둔다.
// 서버는 이 값을 검증만 할 뿐 신뢰된 세션으로 취급하지 않는다(누구나 자유롭게 바꿀 수 있음).
const CURRENT_USER_STORAGE_KEY = 'bo-current-user-id'

interface CurrentUserContextValue {
  currentUser: User | null
  members: User[]
  selectUser: (userId: string) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ members, children }: { members: User[]; children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
    const isStoredValid = stored ? members.some(m => m.id === stored) : false
    setCurrentUserId(isStoredValid ? stored : (members[0]?.id ?? null))
  }, [members])

  function selectUser(userId: string) {
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId)
    setCurrentUserId(userId)
  }

  const currentUser = members.find(m => m.id === currentUserId) ?? null

  return (
    <CurrentUserContext.Provider value={{ currentUser, members, selectUser }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser 는 CurrentUserProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
