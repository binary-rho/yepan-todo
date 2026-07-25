'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { Project } from '@/types'
import { startNewDashboard } from '@/lib/actions'

interface NewDashboardModalProps {
  currentProject: Project
  onClose: () => void
}

export function NewDashboardModal({ currentProject, onClose }: NewDashboardModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [archiveCurrent, setArchiveCurrent] = useState(currentProject.status === 'active')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canArchiveCurrent = currentProject.status === 'active'

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await startNewDashboard({
        name: name.trim(),
        archiveCurrentId: canArchiveCurrent && archiveCurrent ? currentProject.id : null,
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
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
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

          {canArchiveCurrent && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-0"
                checked={archiveCurrent}
                onChange={e => setArchiveCurrent(e.target.checked)}
              />
              <span className="text-[13px] text-zinc-600 tracking-tight">
                현재 대시보드(<span className="font-medium text-zinc-800">{currentProject.name}</span>)를 보관
              </span>
            </label>
          )}
          <p className="text-[11px] text-zinc-400 tracking-tight">
            보관된 대시보드는 읽기 전용으로 언제든 다시 열어볼 수 있습니다.
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
