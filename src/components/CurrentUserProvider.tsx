'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@/types'
import { DEFAULT_MEMBER_ID } from '@/lib/constants'

// 로그인이 없으므로 "지금 이 브라우저를 쓰는 사람이 누구인지"를 로컬에 기억해둔다.
// 서버는 이 값을 검증만 할 뿐 신뢰된 세션으로 취급하지 않는다(누구나 자유롭게 바꿀 수 있음).
// 멤버는 회차(프로젝트)마다 별개이므로, 같은 사람이라도 회차마다 id가 다르다.
// 따라서 선택값도 회차별로 따로 기억해야 한다(키에 projectId 를 포함).
function storageKey(projectId: string): string {
  return `bo-current-user-id:${projectId}`
}

interface CurrentUserContextValue {
  projectId: string
  currentUser: User | null
  members: User[]
  selectUser: (userId: string) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({
  projectId,
  members,
  children,
}: {
  projectId: string
  members: User[]
  children: ReactNode
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(projectId))
    const isStoredValid = stored ? members.some(m => m.id === stored) : false
    if (isStoredValid) {
      setCurrentUserId(stored)
      return
    }
    // 아직 아무도 고르지 않은 브라우저다. 실제 팀원 중 아무나(가나다순 첫 멤버)로 잘못 귀속되지
    // 않도록, 이름이 명확한 플레이스홀더 기본 멤버가 있으면 그걸로 시작하고 없으면 선택을 요구한다.
    const fallback = members.find(m => m.id === DEFAULT_MEMBER_ID)
    setCurrentUserId(fallback?.id ?? null)
  }, [projectId, members])

  function selectUser(userId: string) {
    localStorage.setItem(storageKey(projectId), userId)
    setCurrentUserId(userId)
  }

  const currentUser = members.find(m => m.id === currentUserId) ?? null

  return (
    <CurrentUserContext.Provider value={{ projectId, currentUser, members, selectUser }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser 는 CurrentUserProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
