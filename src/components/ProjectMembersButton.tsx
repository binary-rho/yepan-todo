'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { useProjectMember } from '@/components/ProjectMemberProvider'
import { MembersModal } from '@/components/MembersModal'

// 멤버 목록은 회차(프로젝트)에 귀속되므로 관리 진입점은 각 프로젝트 화면 헤더에 둔다.
// "현재 사용자가 누구인지"는 회차와 무관한 브라우저 설정이라 좌측 내비에 있다. (Nav 참고)
export function ProjectMembersButton() {
  const { projectId, members } = useProjectMember()
  const [membersOpen, setMembersOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setMembersOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 whitespace-nowrap"
      >
        <Users size={13} className="shrink-0" />
        멤버
        <span className="text-zinc-400 tabular-nums">{members.length}</span>
      </button>
      {membersOpen && (
        <MembersModal projectId={projectId} members={members} onClose={() => setMembersOpen(false)} />
      )}
    </>
  )
}
