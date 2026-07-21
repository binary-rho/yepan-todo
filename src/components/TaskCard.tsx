'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, TaskStatus, User } from '@/types'
import { isOverdue } from '@/lib/date'
import { changeTaskStatus } from '@/lib/actions'
import { StatusBadge, EnvBadge, BlockingBadge } from '@/components/badges'
import { DueDateDisplay, AssigneeDisplay } from '@/components/displays'

interface TaskCardProps {
  task: Task
  assignee: User
  showAssignee?: boolean
  compact?: boolean
  rejectionReason?: string | null
  showStatusActions?: boolean
}

export function TaskCard({ task, assignee, showAssignee, compact, rejectionReason, showStatusActions }: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const over = isOverdue(task.dueDate)
  const isReview = task.status === 'review_requested'

  function handleStatusChange(newStatus: TaskStatus) {
    setError(null)
    startTransition(async () => {
      const result = await changeTaskStatus({ taskId: task.id, toStatus: newStatus })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div
      className={`bg-white border rounded p-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
        over ? 'border-red-200' : isReview ? 'border-amber-300' : 'border-zinc-200'
      }`}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`font-medium text-zinc-900 tracking-tight leading-snug flex-1 ${compact ? 'text-[13px]' : 'text-[14px]'}`}>
          {task.title}
        </p>
        <StatusBadge status={task.status} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <EnvBadge env={task.environment} />
        {task.isBlocking && <BlockingBadge />}
        {showAssignee && <AssigneeDisplay user={assignee} />}
      </div>

      <div className="flex items-center justify-between gap-2">
        <DueDateDisplay dueDate={task.dueDate} />
        {showStatusActions && task.status !== 'done' && task.status !== 'review_requested' && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {(task.status === 'todo' || task.status === 'rejected') && (
              <button
                className="text-[11px] px-2 py-0.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight disabled:opacity-40"
                onClick={() => handleStatusChange('in_progress')}
                disabled={isPending}
              >
                진행중으로 변경
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                className="text-[11px] px-2 py-0.5 border border-amber-200 rounded text-amber-700 hover:bg-amber-50 transition-colors tracking-tight disabled:opacity-40"
                onClick={() => handleStatusChange('review_requested')}
                disabled={isPending}
              >
                완료 요청
              </button>
            )}
          </div>
        )}
      </div>

      {isReview && (
        <div className="mt-1.5 pt-1.5 border-t border-amber-100">
          <span className="text-[11px] text-amber-600 font-medium tracking-tight">검토 필요</span>
        </div>
      )}

      {task.status === 'rejected' && rejectionReason && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-[12px] text-red-700 tracking-tight">
            <span className="font-medium">반려 사유: </span>{rejectionReason}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[11px] text-red-500 tracking-tight" onClick={e => e.stopPropagation()}>{error}</p>
      )}
    </div>
  )
}
