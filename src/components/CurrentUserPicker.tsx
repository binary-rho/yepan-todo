'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { useCurrentUser } from '@/components/CurrentUserProvider'
import { MembersModal } from '@/components/MembersModal'

// "현재 사용자" 선택 + 멤버 관리 진입점. 멤버가 회차(프로젝트)에 귀속되므로
// 전역 내비가 아니라 각 프로젝트 화면(보드/템플릿/항목 상세) 헤더에 둔다.
export function CurrentUserPicker() {
  const { projectId, currentUser, members, selectUser } = useCurrentUser()
  const [membersOpen, setMembersOpen] = useState(false)

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {members.length > 0 ? (
        <select
          className="px-2 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight max-w-[7rem]"
          value={currentUser?.id ?? ''}
          onChange={e => selectUser(e.target.value)}
        >
          <option value="" disabled>사용자 선택</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      ) : (
        <span className="text-[12px] text-zinc-400 tracking-tight whitespace-nowrap">멤버 없음</span>
      )}
      <button
        type="button"
        onClick={() => setMembersOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors tracking-tight shrink-0 whitespace-nowrap"
      >
        <Users size={12} />
        멤버 관리
      </button>
      {membersOpen && (
        <MembersModal projectId={projectId} members={members} onClose={() => setMembersOpen(false)} />
      )}
    </div>
  )
}
