'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import type { User } from '@/types'
import { initials } from '@/lib/date'
import { requestLoginLink, devLogin } from '@/lib/actions'

export function LoginView({ users }: { users: User[] }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function send() {
    setError(null)
    startTransition(async () => {
      const result = await requestLoginLink(email.trim())
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="bg-white border border-zinc-200 rounded p-8 w-full max-w-sm">
          <div className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center mb-4">
            <Check size={14} className="text-emerald-600" />
          </div>
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">메일을 확인해주세요</h1>
          <p className="text-[13px] text-zinc-500 mt-1 tracking-tight">{email} 로 로그인 링크를 발송했습니다.</p>

          <div className="mt-5 pt-4 border-t border-zinc-100">
            <p className="text-[11px] text-zinc-400 tracking-tight mb-2 font-medium uppercase">개발용 빠른 로그인</p>
            <div className="space-y-1.5">
              {users.map(u => (
                <button
                  key={u.id}
                  className="w-full text-left px-3 py-2 text-[13px] border border-zinc-200 rounded hover:bg-zinc-50 transition-colors tracking-tight flex items-center justify-between disabled:opacity-40"
                  onClick={() => startTransition(() => devLogin(u.id))}
                  disabled={isPending}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium">{initials(u.name)}</span>
                    <span className="text-zinc-800">{u.name}</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">{u.role === 'admin' ? '관리자' : '담당자'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="bg-white border border-zinc-200 rounded p-8 w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">BO 세팅 관리</h1>
          <p className="text-[13px] text-zinc-500 mt-1 tracking-tight">이메일로 로그인 링크를 받아 접속합니다.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이메일</label>
            <input
              type="email"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && email.trim() && send()}
              placeholder="name@telecom.co.kr"
              autoFocus
            />
            {error && <p className="text-[11px] text-red-500 mt-1 tracking-tight">{error}</p>}
          </div>
          <button
            className="w-full py-2 bg-zinc-900 text-white rounded text-[13px] font-medium hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={send}
            disabled={!email.trim() || isPending}
          >
            로그인 링크 전송
          </button>
        </div>
      </div>
    </div>
  )
}
