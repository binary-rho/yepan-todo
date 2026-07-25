'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { identityInputSchema } from '@/lib/validation'
import { useCurrentIdentity } from '@/components/CurrentIdentityProvider'

// "나는 누구인가"를 본인이 직접 입력한다. 여기 적은 이메일로 회차 멤버와 연결되므로,
// 멤버 관리에 등록된 이메일과 정확히 같아야 한다(다르면 각 화면에서 멤버가 아니라고 알려준다).
export function IdentityModal({ onClose }: { onClose: () => void }) {
  const { identity, saveIdentity } = useCurrentIdentity()
  const [name, setName] = useState(identity?.name ?? '')
  const [email, setEmail] = useState(identity?.email ?? '')
  const [error, setError] = useState<string | null>(null)

  function save() {
    const parsed = identityInputSchema.safeParse({ name, email })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    saveIdentity(parsed.data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">내 정보</h2>
            <p className="text-[11px] text-zinc-400 tracking-tight mt-0.5">이 브라우저에서 하는 작업이 이 이름으로 기록됩니다.</p>
          </div>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이름</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="예) 박지수"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이메일</label>
            <input
              type="email"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="name@company.com"
            />
            <p className="text-[11px] text-zinc-400 tracking-tight mt-1 leading-snug">
              대시보드 멤버로 등록된 이메일과 같아야 합니다. 이 이메일로 회차별 담당자와 연결됩니다.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button
            className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={save}
            disabled={!name.trim() || !email.trim()}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
