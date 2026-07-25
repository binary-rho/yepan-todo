'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// 로그인이 없으므로 "지금 이 브라우저를 쓰는 사람이 누구인지"를 로컬에 기억해둔다.
// 서버는 이 값을 검증만 할 뿐 신뢰된 세션으로 취급하지 않는다(누구나 자유롭게 바꿀 수 있음).
//
// 멤버 목록에서 고르게 하지 않고 본인 정보를 직접 입력받는다. 남의 이름을 한 번의 클릭으로
// 고를 수 있으면 잘못된 귀속이 너무 쉽게 일어나기 때문이다.
// 멤버 행은 회차(프로젝트)마다 별개라 같은 사람이라도 회차마다 id 가 다르므로, 브라우저에는
// 회차를 가로질러 유효한 이메일로 저장하고 회차별 멤버와의 연결은
// ProjectMemberProvider 가 이메일로 매칭해서 처리한다.
const IDENTITY_STORAGE_KEY = 'bo-current-identity'

export interface MemberIdentity {
  email: string
  name: string
}

export function isSameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function readStoredIdentity(): MemberIdentity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { email, name } = parsed as Partial<MemberIdentity>
    if (typeof email !== 'string' || typeof name !== 'string' || !email) return null
    return { email, name }
  } catch {
    return null
  }
}

interface CurrentIdentityContextValue {
  /** 아직 본인 정보를 입력하지 않았으면 null 이고, 이때는 기록을 남기는 동작이 모두 막힌다. */
  identity: MemberIdentity | null
  saveIdentity: (identity: MemberIdentity) => void
}

const CurrentIdentityContext = createContext<CurrentIdentityContextValue | null>(null)

export function CurrentIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<MemberIdentity | null>(null)

  useEffect(() => {
    setIdentity(readStoredIdentity())
  }, [])

  function saveIdentity(next: MemberIdentity) {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(next))
    setIdentity(next)
  }

  return (
    <CurrentIdentityContext.Provider value={{ identity, saveIdentity }}>
      {children}
    </CurrentIdentityContext.Provider>
  )
}

export function useCurrentIdentity(): CurrentIdentityContextValue {
  const ctx = useContext(CurrentIdentityContext)
  if (!ctx) throw new Error('useCurrentIdentity 는 CurrentIdentityProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
