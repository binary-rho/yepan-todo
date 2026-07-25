'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { User } from '@/types'
import { updateProfile } from '@/lib/actions'

interface ProfileModalProps {
  user: User
  onClose: () => void
}

export function ProfileModal({ user, onClose }: ProfileModalProps) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setServerError(null)
    startTransition(async () => {
      const result = await updateProfile({ name: name.trim(), email: email.trim() })
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">내 프로필</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {serverError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{serverError}</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이름</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이메일</label>
            <input
              type="email"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="me@example.com"
            />
          </div>
          <p className="text-[11px] text-zinc-400 tracking-tight">
            이 정보는 항목을 만들거나 상태를 바꿀 때 작성자로 기록됩니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={save}
            disabled={isPending}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
