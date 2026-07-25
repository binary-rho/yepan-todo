'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createMember } from '@/lib/actions'
import { useProjectMember } from '@/components/ProjectMemberProvider'
import type { MemberIdentity } from '@/components/CurrentIdentityProvider'

// 현재 사용자가 이 회차의 멤버가 아니면 아무 작업도 할 수 없으므로, 조용히 실패하지 않도록
// 눈에 보이게 알리고 곧바로 멤버로 합류할 수 있게 한다.
// (보관된 회차에서는 쓰기 자체가 막혀 있어 호출하는 화면에서 띄우지 않는다)
export function MembershipAlert() {
  const { projectId, notMemberIdentity } = useProjectMember()
  if (!notMemberIdentity) return null
  return <NotMemberBanner projectId={projectId} identity={notMemberIdentity} />
}

function NotMemberBanner({ projectId, identity }: { projectId: string; identity: MemberIdentity }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function joinProject() {
    setError(null)
    startTransition(async () => {
      const result = await createMember(projectId, {
        name: identity.name,
        email: identity.email,
        teamRole: null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2.5">
      <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-red-700 tracking-tight">
          현재 사용자 <span className="font-medium">{identity.name}</span>
          <span className="text-red-500"> ({identity.email})</span> 님은 이 대시보드의 멤버가 아닙니다.
        </p>
        <p className="text-[12px] text-red-600/80 tracking-tight mt-0.5">
          이 대시보드에서 항목을 만들거나 상태를 바꾸려면 멤버로 합류하거나, 좌측에서 내 정보를 다시 확인해주세요.
        </p>
        {error && <p className="text-[12px] text-red-700 tracking-tight mt-1">{error}</p>}
      </div>
      <button
        className="px-2.5 py-1.5 text-[12px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors tracking-tight shrink-0 whitespace-nowrap disabled:opacity-40"
        onClick={joinProject}
        disabled={isPending}
      >
        이 대시보드 멤버로 추가
      </button>
    </div>
  )
}
