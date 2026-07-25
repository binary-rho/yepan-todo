'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@/types'
import { isSameEmail, useCurrentIdentity, type MemberIdentity } from '@/components/CurrentIdentityProvider'

// 브라우저에 저장된 "현재 사용자"(이메일)를 지금 보고 있는 회차의 멤버 행과 연결한다.
// 상태변경/코멘트/메모의 작성자로는 회차 멤버 행 id 가 기록되므로, 이 매칭이 되지 않으면
// 그 사람은 이 회차에서 아무 작업도 할 수 없다(notMemberIdentity 로 알린다).
interface ProjectMemberContextValue {
  projectId: string
  members: User[]
  /** 현재 사용자에 해당하는 이 회차의 멤버. 매칭되지 않으면 null 이다. */
  currentUser: User | null
  /** 현재 사용자가 이 회차 멤버가 아닐 때 그 사람. 정상이면 null 이다. */
  notMemberIdentity: MemberIdentity | null
}

const ProjectMemberContext = createContext<ProjectMemberContextValue | null>(null)

export function ProjectMemberProvider({
  projectId,
  members,
  children,
}: {
  projectId: string
  members: User[]
  children: ReactNode
}) {
  const { identity } = useCurrentIdentity()

  const currentUser = identity
    ? members.find(member => isSameEmail(member.email, identity.email)) ?? null
    : null
  const notMemberIdentity = identity && !currentUser ? identity : null

  return (
    <ProjectMemberContext.Provider value={{ projectId, members, currentUser, notMemberIdentity }}>
      {children}
    </ProjectMemberContext.Provider>
  )
}

export function useProjectMember(): ProjectMemberContextValue {
  const ctx = useContext(ProjectMemberContext)
  if (!ctx) throw new Error('useProjectMember 는 ProjectMemberProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
