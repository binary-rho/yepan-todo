'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, Bell, Plus } from 'lucide-react'
import type { User } from '@/types'
import { getManualCallDraft, notifyTaskNow } from '@/lib/actions'
import { useModalBackdropClose } from '@/hooks/useModalBackdropClose'

// Teams 로 보낼 때 실제로 앞에 붙는 멘션 태그. transport.ts 의 mentionTagOf/buildCardPayload 와 규칙이 같아야 한다.
function mentionTagOf(name: string): string {
  return `@${name}`
}

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
  const [showCcPicker, setShowCcPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 담당자는 이미 기본 태그이므로 CC 후보에서 뺀다.
  const ccOptions = members.filter((m) => m.id !== assignee?.id)
  const selectedCc = ccOptions.filter((m) => ccMemberIds.includes(m.id))
  const remainingCc = ccOptions.filter((m) => !ccMemberIds.includes(m.id))

  const previewText = [
    assignee ? `${mentionTagOf(assignee.name)} ${text}` : text,
    selectedCc.length > 0 ? `cc. ${selectedCc.map((m) => mentionTagOf(m.name)).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

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

  function addCc(memberId: string) {
    setCcMemberIds((prev) => [...prev, memberId])
    setShowCcPicker(false)
  }

  function removeCc(memberId: string) {
    setCcMemberIds((prev) => prev.filter((id) => id !== memberId))
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
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">알림 보내기</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[12px] font-medium text-zinc-600 tracking-tight">문구</label>
              {assignee ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium tracking-tight">
                  {mentionTagOf(assignee.name)}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-400 tracking-tight">담당자 없음 · 태그 없이 채널에만 발송</span>
              )}
            </div>
            <textarea
              className="w-full px-3 py-2 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none disabled:opacity-50"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isLoadingDraft}
              placeholder={isLoadingDraft ? '기본 문구를 불러오는 중...' : undefined}
            />
          </div>

          {ccOptions.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">CC (선택)</label>
              <div className="flex items-center gap-1.5 flex-wrap relative">
                {selectedCc.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[12px] tracking-tight"
                  >
                    {m.name}
                    <button
                      className="text-zinc-400 hover:text-zinc-700"
                      onClick={() => removeCc(m.id)}
                      aria-label={`${m.name} CC 제거`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {remainingCc.length > 0 && (
                  <button
                    className="inline-flex items-center justify-center w-5 h-5 rounded border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors"
                    onClick={() => setShowCcPicker((prev) => !prev)}
                    aria-label="CC 추가"
                  >
                    <Plus size={12} />
                  </button>
                )}

                {showCcPicker && (
                  <div className="absolute top-6 left-0 z-10 bg-white border border-zinc-200 rounded shadow-md py-1 min-w-32 max-h-40 overflow-y-auto">
                    {remainingCc.map((m) => (
                      <button
                        key={m.id}
                        className="block w-full text-left px-3 py-1.5 text-[12px] text-zinc-700 hover:bg-zinc-50 tracking-tight whitespace-nowrap"
                        onClick={() => addCc(m.id)}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">미리보기</label>
            <div className="px-3 py-2 border border-zinc-100 bg-zinc-50 rounded text-[12px] text-zinc-500 tracking-tight whitespace-pre-wrap">
              {previewText || '\u00A0'}
            </div>
          </div>
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
