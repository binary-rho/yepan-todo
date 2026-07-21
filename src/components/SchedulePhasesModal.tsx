'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { SchedulePhase } from '@/types'
import { saveSchedulePhases } from '@/lib/actions'

interface SchedulePhasesModalProps {
  phases: SchedulePhase[]
  onClose: () => void
  onSaved: () => void
}

interface PhaseRow {
  name: string
  startDate: string
  endDate: string
}

function toRow(phase: SchedulePhase): PhaseRow {
  return { name: phase.name, startDate: phase.startDate, endDate: phase.endDate ?? '' }
}

export function SchedulePhasesModal({ phases, onClose, onSaved }: SchedulePhasesModalProps) {
  const [rows, setRows] = useState<PhaseRow[]>(
    phases.length > 0 ? phases.map(toRow) : [{ name: '', startDate: '', endDate: '' }],
  )
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateRow(index: number, patch: Partial<PhaseRow>) {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows(prev => [...prev, { name: '', startDate: '', endDate: '' }])
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  function save() {
    setServerError(null)
    const payload = rows
      .filter(row => row.name.trim() || row.startDate)
      .map(row => ({
        name: row.name.trim(),
        startDate: row.startDate,
        endDate: row.endDate || null,
      }))
    startTransition(async () => {
      const result = await saveSchedulePhases(payload)
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">일정 편집</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {serverError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{serverError}</p>
            </div>
          )}

          <p className="text-[12px] text-zinc-500 tracking-tight">
            출시 국면과 기간을 등록합니다. 항목 생성 시 국면을 고르면 그 <span className="font-medium text-zinc-700">시작일</span>이 마감일로 자동 입력됩니다.
          </p>

          <div className="grid grid-cols-[1fr_130px_130px_auto] gap-2 items-center px-0.5">
            <span className="text-[11px] text-zinc-400 tracking-tight">국면 이름</span>
            <span className="text-[11px] text-zinc-400 tracking-tight">시작일</span>
            <span className="text-[11px] text-zinc-400 tracking-tight">종료일 (선택)</span>
            <span />
          </div>

          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_130px_130px_auto] gap-2 items-center">
              <input
                className="px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={row.name}
                onChange={e => updateRow(index, { name: e.target.value })}
                placeholder="예) 사전예약"
              />
              <input
                type="date"
                className="px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={row.startDate}
                onChange={e => updateRow(index, { startDate: e.target.value })}
              />
              <input
                type="date"
                className="px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={row.endDate}
                onChange={e => updateRow(index, { endDate: e.target.value })}
              />
              <button
                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                onClick={() => removeRow(index)}
                aria-label="국면 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={addRow}
          >
            <Plus size={12} />
            국면 추가
          </button>
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
