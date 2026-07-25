'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Environment, Template, TemplateItem, User } from '@/types'
import { createTemplate, updateTemplate } from '@/lib/actions'

interface TemplateEditorModalProps {
  template?: Template
  initialItems?: TemplateItem[]
  userList: User[]
  onClose: () => void
  onSaved: () => void
}

interface ItemRow {
  title: string
  environment: '' | Environment
  isBlocking: boolean
  confluenceUrl: string
  verifyUrl: string
  verifyPoint: string
  defaultAssigneeId: string
}

function emptyRow(): ItemRow {
  return { title: '', environment: 'prd', isBlocking: false, confluenceUrl: '', verifyUrl: '', verifyPoint: '', defaultAssigneeId: '' }
}

function toRow(item: TemplateItem): ItemRow {
  return {
    title: item.title,
    environment: item.environment ?? '',
    isBlocking: item.isBlocking,
    confluenceUrl: item.confluenceUrl ?? '',
    verifyUrl: item.verifyUrl ?? '',
    verifyPoint: item.verifyPoint ?? '',
    defaultAssigneeId: item.defaultAssigneeId ?? '',
  }
}

export function TemplateEditorModal({ template, initialItems, userList, onClose, onSaved }: TemplateEditorModalProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [rows, setRows] = useState<ItemRow[]>(
    initialItems && initialItems.length > 0 ? initialItems.map(toRow) : [emptyRow()],
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function addRow() {
    setRows(prev => [...prev, emptyRow()])
  }
  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  function save() {
    setError(null)
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      items: rows.map(row => ({
        title: row.title.trim(),
        description: null,
        environment: row.environment || null,
        isBlocking: row.isBlocking,
        confluenceUrl: row.confluenceUrl.trim() || null,
        verifyUrl: row.verifyUrl.trim() || null,
        verifyPoint: row.verifyPoint.trim() || null,
        defaultAssigneeId: row.defaultAssigneeId,
      })),
    }
    startTransition(async () => {
      const result = template
        ? await updateTemplate(template.id, payload)
        : await createTemplate(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">{template ? '템플릿 수정' : '새 템플릿'}</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">템플릿 이름 <span className="text-red-500">*</span></label>
              <input
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="예) 신규 요금제 예약판매 세팅"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">설명</label>
              <input
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="이 템플릿의 용도를 간단히"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-medium text-zinc-600 tracking-tight">포함 항목 <span className="text-zinc-400 tabular-nums">({rows.length})</span></p>
            </div>

            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="border border-zinc-200 rounded p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                      value={row.title}
                      onChange={e => updateRow(index, { title: e.target.value })}
                      placeholder="항목 제목 (예: 요금제 노출 순서 설정)"
                    />
                    <button
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                      onClick={() => removeRow(index)}
                      aria-label="항목 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                    <select
                      className="px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 bg-white"
                      value={row.defaultAssigneeId}
                      onChange={e => updateRow(index, { defaultAssigneeId: e.target.value })}
                    >
                      <option value="">담당자 선택</option>
                      {userList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select
                      className="px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 bg-white"
                      value={row.environment}
                      onChange={e => updateRow(index, { environment: e.target.value as '' | Environment })}
                    >
                      <option value="">환경 없음</option>
                      <option value="dev">DEV</option>
                      <option value="stg">STG</option>
                      <option value="prd">PRD</option>
                    </select>
                    <label className="flex items-center gap-1.5 cursor-pointer px-1">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-0"
                        checked={row.isBlocking}
                        onChange={e => updateRow(index, { isBlocking: e.target.checked })}
                      />
                      <span className="text-[12px] text-zinc-600 tracking-tight whitespace-nowrap">차단</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="px-2.5 py-1.5 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400"
                      value={row.confluenceUrl}
                      onChange={e => updateRow(index, { confluenceUrl: e.target.value })}
                      placeholder="컨플루언스 URL (선택)"
                    />
                    <input
                      className="px-2.5 py-1.5 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400"
                      value={row.verifyUrl}
                      onChange={e => updateRow(index, { verifyUrl: e.target.value })}
                      placeholder="확인 URL (선택)"
                    />
                  </div>
                  <input
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400"
                    value={row.verifyPoint}
                    onChange={e => updateRow(index, { verifyPoint: e.target.value })}
                    placeholder="확인 포인트 (선택)"
                  />
                </div>
              ))}
            </div>

            <button
              className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
              onClick={addRow}
            >
              <Plus size={12} />
              항목 추가
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200 sticky bottom-0 bg-white">
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
