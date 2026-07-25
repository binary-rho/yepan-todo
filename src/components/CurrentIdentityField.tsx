'use client'

import { useState } from 'react'
import { UserCog } from 'lucide-react'
import { useCurrentIdentity } from '@/components/CurrentIdentityProvider'
import { IdentityModal } from '@/components/IdentityModal'

// 좌측 내비 하단에 상주하는 "현재 사용자" 영역. 회차를 옮겨 다녀도 이 값은 브라우저에 그대로 유지되고,
// 지금 보고 있는 회차의 멤버인지는 각 화면의 MembershipAlert 가 알려준다.
export function CurrentIdentityField() {
  const { identity } = useCurrentIdentity()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="px-3 py-3 border-t border-zinc-100">
      <p className="text-[11px] font-medium text-zinc-400 tracking-tight mb-1.5">현재 사용자</p>

      {identity ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center gap-2 p-1.5 -mx-1.5 rounded hover:bg-zinc-50 transition-colors text-left group"
          title="내 정보 수정"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 text-white text-[11px] font-medium shrink-0">
            {identity.name.slice(0, 2)}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium text-zinc-800 tracking-tight truncate">{identity.name}</span>
            <span className="block text-[11px] text-zinc-400 tracking-tight truncate">{identity.email}</span>
          </span>
          <UserCog size={13} className="text-zinc-300 group-hover:text-zinc-500 shrink-0" />
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight"
          >
            <UserCog size={13} />
            내 정보 입력
          </button>
          <p className="text-[11px] text-amber-600 tracking-tight mt-1.5 leading-snug">
            입력 전에는 항목 생성·상태 변경 등 기록을 남길 수 없습니다.
          </p>
        </>
      )}

      {modalOpen && <IdentityModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
