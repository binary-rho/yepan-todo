'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { Environment, Template } from '@/types'
import type { ActionResult } from '@/lib/actions'

interface TemplateUseModalProps {
  template: Template
  onClose: () => void
  onConfirm: (env: Environment, baseDate: string) => Promise<ActionResult>
}

export function TemplateUseModal({ template, onClose, onConfirm }: TemplateUseModalProps) {
  const [env, setEnv] = useState<Environment>('dev')
  const [baseDate, setBaseDate] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setServerError(null)
    startTransition(async () => {
      const result = await onConfirm(env, baseDate)
      if (!result.ok) setServerError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
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
          <div>
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
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">기준 마감일</label>
            <input
              type="date"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={baseDate}
              onChange={e => setBaseDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button
            className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={submit}
            disabled={isPending}
          >
            생성
          </button>
        </div>
      </div>
    </div>
  )
}
