'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { Environment, SchedulePhase, Task, User } from '@/types'
import type { ActionResult } from '@/lib/actions'

export interface TaskFormData {
  title: string
  description: string | null
  assigneeId: string
  environment: Environment
  dueDate: string | null
  confluenceUrl: string | null
  verifyUrl: string | null
  verifyPoint: string | null
}

interface TaskModalProps {
  task?: Task
  userList: User[]
  phases: SchedulePhase[]
  onClose: () => void
  onSubmit: (data: TaskFormData) => Promise<ActionResult>
}

function phaseLabel(phase: SchedulePhase): string {
  const range = phase.endDate ? `${phase.startDate} ~ ${phase.endDate}` : phase.startDate
  return `${phase.name} (${range})`
}

export function TaskModal({ task, userList, phases, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [desc, setDesc] = useState(task?.description ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [env, setEnv] = useState<Environment>(task?.environment ?? 'dev')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [selectedPhaseId, setSelectedPhaseId] = useState('')
  const [confUrl, setConfUrl] = useState(task?.confluenceUrl ?? '')
  const [verifyUrl, setVerifyUrl] = useState(task?.verifyUrl ?? '')
  const [verifyPoint, setVerifyPoint] = useState(task?.verifyPoint ?? '')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const assignees = userList

  function handlePhaseChange(phaseId: string) {
    setSelectedPhaseId(phaseId)
    const phase = phases.find(p => p.id === phaseId)
    if (phase) setDueDate(phase.startDate)
  }

  function submit() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = '제목을 입력해주세요'
    if (!assigneeId) e.assigneeId = '담당자를 선택해주세요'
    if (Object.keys(e).length) { setErrs(e); return }
    setServerError(null)
    startTransition(async () => {
      const result = await onSubmit({
        title: title.trim(),
        description: desc.trim() || null,
        assigneeId,
        environment: env,
        dueDate: dueDate || null,
        confluenceUrl: confUrl.trim() || null,
        verifyUrl: verifyUrl.trim() || null,
        verifyPoint: verifyPoint.trim() || null,
      })
      if (!result.ok) setServerError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">{task ? '항목 수정' : '새 항목 생성'}</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {serverError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{serverError}</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-3 py-1.5 border rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 ${errs.title ? 'border-red-300' : 'border-zinc-200'}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="BO 세팅 항목 제목"
            />
            {errs.title && <p className="text-[11px] text-red-500 mt-0.5 tracking-tight">{errs.title}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">설명</label>
            <textarea
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none"
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="세팅 내용을 상세히 설명해주세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">
                담당자 <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full px-3 py-1.5 border rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 bg-white ${errs.assigneeId ? 'border-red-300' : 'border-zinc-200'}`}
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="">선택</option>
                {assignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errs.assigneeId && <p className="text-[11px] text-red-500 mt-0.5 tracking-tight">{errs.assigneeId}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">
                환경 <span className="text-red-500">*</span>
              </label>
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
          </div>

          {phases.length > 0 && (
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">일정 국면</label>
              <select
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 bg-white"
                value={selectedPhaseId}
                onChange={e => handlePhaseChange(e.target.value)}
              >
                <option value="">선택 안 함 (마감일 직접 입력)</option>
                {phases.map(p => <option key={p.id} value={p.id}>{phaseLabel(p)}</option>)}
              </select>
              <p className="text-[11px] text-zinc-400 mt-0.5 tracking-tight">국면을 고르면 시작일이 마감일로 채워집니다. 아래에서 직접 수정할 수도 있습니다.</p>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">마감일</label>
            <input
              type="date"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">컨플루언스 URL</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={confUrl}
              onChange={e => setConfUrl(e.target.value)}
              placeholder="https://confluence.example.com/..."
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">확인 URL</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={verifyUrl}
              onChange={e => setVerifyUrl(e.target.value)}
              placeholder="https://admin.telecom.co.kr/..."
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">확인 포인트</label>
            <input
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={verifyPoint}
              onChange={e => setVerifyPoint(e.target.value)}
              placeholder="무엇을 확인해야 하는지 설명"
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
            {task ? '저장' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}
