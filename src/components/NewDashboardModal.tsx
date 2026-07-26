'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { startNewDashboard } from '@/lib/actions'
import { useModalBackdropClose } from '@/hooks/useModalBackdropClose'

interface NewDashboardModalProps {
  onClose: () => void
}

// 활성 대시보드는 항상 하나여야 하므로(그렇지 않으면 어느 회차가 "현재"인지 헷갈린다),
// 보관 여부를 선택하게 두지 않는다. 새 대시보드를 만들면 기존 활성 대시보드는 무조건 보관된다.
export function NewDashboardModal({ onClose }: NewDashboardModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const backdrop = useModalBackdropClose(onClose)

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await startNewDashboard({
        name: name.trim(),
        description: description.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
      router.push(result.projectId ? `/?project=${result.projectId}` : '/')
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" {...backdrop}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">새 대시보드</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">대시보드 이름</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="예) 2026 여름 예판"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">
              설명 <span className="text-zinc-400 font-normal">(선택, 보관함 목록에 표시됩니다)</span>
            </label>
            <textarea
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="예) 어떤 목적의 대시보드인지 간단히 적어주세요"
            />
          </div>

          <p className="text-[11px] text-zinc-400 tracking-tight">
            만들면 지금 활성 상태인 대시보드는 자동으로 보관되고(읽기 전용, 보관함에서 언제든 다시 열람), 새 대시보드가 활성화됩니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={create}
            disabled={isPending}
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  )
}
