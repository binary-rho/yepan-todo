'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, Bell } from 'lucide-react'
import type { User } from '@/types'
import { getManualCallDraft, notifyTaskNow } from '@/lib/actions'
import { useModalBackdropClose } from '@/hooks/useModalBackdropClose'

interface NotifyModalProps {
  taskId: string
  assignee: User | null
  // 이 회차 멤버 전체. 담당자는 이미 기본 태그이므로 CC 후보에서 뺀다.
  members: User[]
  onClose: () => void
  onSent: (message: string) => void
}

// 담당자에게 바로 알림을 쏘는 대신, 문구를 확인/수정하고 CC 를 골라 보낼 수 있는 팝업.
export function NotifyModal({ taskId, assignee, members, onClose, onSent }: NotifyModalProps) {
  const backdrop = useModalBackdropClose(onClose)
  const [text, setText] = useState('')
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [ccMemberIds, setCcMemberIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const ccCandidates = members.filter((m) => m.id !== assignee?.id)
  const ccNames = members.filter((m) => ccMemberIds.includes(m.id)).map((m) => m.name)

  useEffect(() => {
    let cancelled = false
    setIsLoadingDraft(true)
    getManualCallDraft(taskId).then((result) => {
      if (cancelled) return
      if (result.ok && result.text) setText(result.text)
      else setError(result.ok ? null : result.error)
      setIsLoadingDraft(false)
    })
    return () => { cancelled = true }
  }, [taskId])

  function toggleCc(memberId: string) {
    setCcMemberIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  function send() {
    if (!text.trim()) { setError('문구를 입력해주세요.'); return }
    setError(null)
    startTransition(async () => {
      const result = await notifyTaskNow(taskId, { text: text.trim(), ccMemberIds })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSent(assignee ? '담당자에게 알림을 보냈습니다.' : '사람 태그 없이 채널에 알림을 보냈습니다.')
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" {...backdrop}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">알림 보내기</h2>
            <p className="text-[11px] text-zinc-400 tracking-tight mt-0.5">
              태그: {assignee ? assignee.name : '없음 (담당자 미지정)'}
            </p>
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
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">문구</label>
            <textarea
              className="w-full px-3 py-2 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none disabled:opacity-50"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoadingDraft}
              placeholder={isLoadingDraft ? '기본 문구를 불러오는 중...' : undefined}
            />
          </div>

          {ccCandidates.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">CC (선택)</label>
              <div className="border border-zinc-200 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                {ccCandidates.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-1 py-1 rounded text-[13px] text-zinc-700 cursor-pointer hover:bg-zinc-50 tracking-tight">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-0"
                      checked={ccMemberIds.includes(m.id)}
                      onChange={() => toggleCc(m.id)}
                    />
                    {m.name}
                  </label>
                ))}
              </div>
              {ccNames.length > 0 && (
                <p className="text-[11px] text-zinc-400 tracking-tight mt-1">문구 끝에 &quot;cc. {ccNames.join(', ')}&quot; 가 붙어서 발송됩니다.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200 sticky bottom-0 bg-white">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={send}
            disabled={isPending || isLoadingDraft}
          >
            <Bell size={12} />
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
