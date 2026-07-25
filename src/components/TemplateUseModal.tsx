'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { Environment, Template, TemplateItem, User } from '@/types'
import type { ActionResult } from '@/lib/actions'

interface TemplateUseModalProps {
  template: Template
  items: TemplateItem[]
  members: User[]
  onClose: () => void
  onConfirm: (env: Environment, baseDate: string, assigneeByItemId: Record<string, string>) => Promise<ActionResult>
}

// 템플릿 항목의 "기본 담당자" 힌트와 이름이 같은 멤버가 있으면 미리 선택해둔다(있으면 편의, 없으면 무해).
function guessAssigneeId(item: TemplateItem, members: User[]): string {
  if (!item.defaultAssigneeName) return ''
  const hint = item.defaultAssigneeName.trim().toLowerCase()
  return members.find(m => m.name.trim().toLowerCase() === hint)?.id ?? ''
}

export function TemplateUseModal({ template, items, members, onClose, onConfirm }: TemplateUseModalProps) {
  const [env, setEnv] = useState<Environment>('dev')
  const [baseDate, setBaseDate] = useState('')
  const [assigneeByItemId, setAssigneeByItemId] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map(item => [item.id, guessAssigneeId(item, members)])),
  )
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasNoMembers = members.length === 0
  const allAssigned = items.every(item => assigneeByItemId[item.id])

  function setAssignee(itemId: string, userId: string) {
    setAssigneeByItemId(prev => ({ ...prev, [itemId]: userId }))
  }

  function submit() {
    setServerError(null)
    startTransition(async () => {
      const result = await onConfirm(env, baseDate, assigneeByItemId)
      if (!result.ok) setServerError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">템플릿으로 항목 생성</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-4 space-y-3">
          {serverError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{serverError}</p>
            </div>
          )}
          <p className="text-[13px] text-zinc-500 tracking-tight">
            <span className="font-medium text-zinc-700">{template.name}</span> 템플릿으로{' '}
            <span className="tabular-nums">{template.itemCount}</span>개 항목을 생성합니다.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">환경</label>
              <select
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 bg-white"
                value={env}
                onChange={e => setEnv(e.target.value as Environment)}
              >
                <option value="dev">DEV</option>
                <option value="stg">STG</option>
                <option value="prd">PRD</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">기준 마감일</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={baseDate}
                onChange={e => setBaseDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">항목별 담당자</label>
            {hasNoMembers ? (
              <p className="text-[12px] text-red-500 tracking-tight">
                이 회차에 멤버가 없습니다. 먼저 보드에서 멤버를 추가해주세요.
              </p>
            ) : (
              <div className="space-y-1.5">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-[13px] text-zinc-700 tracking-tight truncate" title={item.title}>
                      {item.title}
                      {item.defaultAssigneeName && (
                        <span className="text-zinc-400"> ({item.defaultAssigneeName})</span>
                      )}
                    </span>
                    <select
                      className="w-28 shrink-0 px-2 py-1 text-[12px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight"
                      value={assigneeByItemId[item.id] ?? ''}
                      onChange={e => setAssignee(item.id, e.target.value)}
                    >
                      <option value="" disabled>담당자 선택</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200 sticky bottom-0 bg-white">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={submit}
            disabled={isPending || hasNoMembers || !allAssigned || !baseDate}
          >
            생성
          </button>
        </div>
      </div>
    </div>
  )
}
