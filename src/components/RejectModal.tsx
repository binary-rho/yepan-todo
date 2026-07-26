'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useModalBackdropClose } from '@/hooks/useModalBackdropClose'

export function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)
  const backdrop = useModalBackdropClose(onClose)

  function submit() {
    if (!reason.trim()) { setError(true); return }
    onConfirm(reason.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" {...backdrop}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">재설정 사유 입력</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-4">
          <textarea
            className={`w-full px-3 py-2 border rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none ${error ? 'border-red-300' : 'border-zinc-200'}`}
            rows={4}
            value={reason}
            onChange={e => { setReason(e.target.value); setError(false) }}
            placeholder="어떤 부분을 다시 설정해야 하는지 담당자에게 전달할 내용을 입력해주세요"
            autoFocus
          />
          {error && <p className="text-[11px] text-red-500 mt-0.5 tracking-tight">재설정 사유를 입력해주세요</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button className="px-3 py-1.5 text-[13px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors tracking-tight" onClick={submit}>재설정 요청</button>
        </div>
      </div>
    </div>
  )
}
