'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'
import { startNewDashboard } from '@/lib/actions'

export function EmptyBoard() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await startNewDashboard({ name: name.trim() || '새 대시보드' })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(result.projectId ? `/?project=${result.projectId}` : '/')
      router.refresh()
    })
  }

  return (
    <div className="px-6 py-6 flex items-center justify-center h-full">
      <div className="text-center max-w-sm w-full">
        <LayoutDashboard size={28} className="text-zinc-300 mx-auto mb-3" />
        <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight mb-1">대시보드가 없습니다</h1>
        <p className="text-[13px] text-zinc-500 tracking-tight mb-4">첫 대시보드를 만들어 세팅 항목을 관리하세요.</p>
        <div className="flex gap-2">
          <input
            className="flex-1 min-w-0 px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="예) 2026 여름 예판"
          />
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40 shrink-0"
            onClick={create}
            disabled={isPending}
          >
            만들기
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600 tracking-tight">{error}</p>}
      </div>
    </div>
  )
}
