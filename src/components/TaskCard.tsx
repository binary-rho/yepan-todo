'use client'

import { useState, useTransition, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, AlertCircle } from 'lucide-react'
import type { Task, TaskStatus, User } from '@/types'
import type { ActionResult } from '@/lib/actions'
import { isOverdue } from '@/lib/date'
import { allowedNextStatuses } from '@/lib/transitions'
import { StatusBadge, EnvBadge } from '@/components/badges'
import { DueDateDisplay, AssigneeDisplay } from '@/components/displays'

interface TaskCardProps {
  task: Task
  assignee: User | null
  showAssignee?: boolean
  rejectionReason?: string | null
  draggable?: boolean
  onDragStart?: (e: DragEvent) => void
  onDragEnd?: (e: DragEvent) => void
  dragging?: boolean
  // 대시보드 인라인 조작(없으면 표시 전용)
  assignees?: User[]
  readOnly?: boolean
  onMove?: (status: TaskStatus) => void
  onAssigneeChange?: (assigneeId: string) => Promise<ActionResult>
  onNotify?: () => Promise<ActionResult>
}

// 카드 안의 상태 이동 버튼 라벨/스타일.
const MOVE_ACTION: Record<TaskStatus, { label: string; cls: string }> = {
  todo: { label: '할 일', cls: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100' },
  done: { label: '완료', cls: 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
  rejected: { label: '반려', cls: 'border border-red-200 text-red-600 hover:bg-red-50' },
  in_progress: { label: '진행중', cls: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100' },
  review_requested: { label: '완료요청', cls: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100' },
}

type NotifyState = 'idle' | 'sending' | 'sent' | 'error'

export function TaskCard({
  task,
  assignee,
  showAssignee,
  rejectionReason,
  draggable,
  onDragStart,
  onDragEnd,
  dragging,
  assignees,
  readOnly,
  onMove,
  onAssigneeChange,
  onNotify,
}: TaskCardProps) {
  const router = useRouter()
  const over = isOverdue(task.dueDate)
  const interactive = !readOnly && Boolean(onMove || onAssigneeChange || onNotify)
  const nextStatuses = allowedNextStatuses(task.status)

  const [assigneeError, setAssigneeError] = useState<string | null>(null)
  const [assigneePending, startAssignee] = useTransition()
  const [notifyState, setNotifyState] = useState<NotifyState>('idle')
  const [notifyError, setNotifyError] = useState<string | null>(null)

  function stop(e: { stopPropagation: () => void }) {
    e.stopPropagation()
  }

  function handleAssignee(assigneeId: string) {
    if (!onAssigneeChange || assigneeId === (task.assigneeId ?? '')) return
    setAssigneeError(null)
    startAssignee(async () => {
      const result = await onAssigneeChange(assigneeId)
      if (!result.ok) setAssigneeError(result.error)
    })
  }

  async function handleNotify() {
    if (!onNotify) return
    setNotifyError(null)
    setNotifyState('sending')
    const result = await onNotify()
    if (result.ok) {
      setNotifyState('sent')
      setTimeout(() => setNotifyState('idle'), NOTIFY_RESET_MS)
    } else {
      setNotifyState('error')
      setNotifyError(result.error)
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border rounded p-3 transition-colors ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${dragging ? 'opacity-40' : ''} ${over ? 'border-red-200' : 'border-zinc-200'} hover:border-zinc-300`}
    >
      <div className="cursor-pointer" onClick={() => router.push(`/tasks/${task.id}`)}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-medium text-zinc-900 tracking-tight leading-snug flex-1 text-[14px]">
            {task.title}
          </p>
          <StatusBadge status={task.status} />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <EnvBadge env={task.environment} />
        </div>

        <div className="flex items-center justify-between gap-2">
          {showAssignee && !interactive && <AssigneeDisplay user={assignee} />}
          <DueDateDisplay dueDate={task.dueDate} />
        </div>
      </div>

      {task.status === 'rejected' && rejectionReason && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-[12px] text-red-700 tracking-tight">
            <span className="font-medium">반려 사유: </span>{rejectionReason}
          </p>
        </div>
      )}

      {interactive && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2" onClick={stop}>
          {onAssigneeChange && assignees ? (
            <select
              className="w-full px-2 py-1 text-[12px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight disabled:opacity-50"
              value={task.assigneeId ?? ''}
              disabled={assigneePending}
              onChange={e => handleAssignee(e.target.value)}
            >
              <option value="">담당자 미지정</option>
              {assignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          ) : (
            showAssignee && <AssigneeDisplay user={assignee} />
          )}
          {assigneeError && <p className="text-[11px] text-red-500 tracking-tight">{assigneeError}</p>}

          <div className="flex items-center gap-1 flex-wrap">
            {onMove && nextStatuses.map(status => {
              const { label, cls } = MOVE_ACTION[status]
              return (
                <button
                  key={status}
                  className={`px-2 py-1 text-[11px] rounded transition-colors tracking-tight ${cls}`}
                  onClick={() => onMove(status)}
                >
                  {label}
                </button>
              )
            })}
            {onNotify && (
              <button
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors tracking-tight disabled:opacity-50"
                onClick={handleNotify}
                disabled={notifyState === 'sending'}
                title={task.assigneeId ? '담당자에게 알림 보내기' : '담당자 지정 요청을 채널에 보내기 (사람 태그 없음)'}
              >
                {notifyState === 'sent' ? <Check size={11} className="text-emerald-600" /> : notifyState === 'error' ? <AlertCircle size={11} className="text-red-500" /> : <Bell size={11} />}
                {notifyState === 'sent' ? '전송됨' : notifyState === 'sending' ? '전송중' : '호출'}
              </button>
            )}
          </div>
          {notifyError && <p className="text-[11px] text-red-500 tracking-tight">{notifyError}</p>}
        </div>
      )}
    </div>
  )
}

const NOTIFY_RESET_MS = 2000
