'use client'

import { useRouter } from 'next/navigation'
import type { Task, User } from '@/types'
import { isOverdue } from '@/lib/date'
import { StatusBadge, EnvBadge, BlockingBadge } from '@/components/badges'
import { DueDateDisplay, AssigneeDisplay } from '@/components/displays'

interface TaskCardProps {
  task: Task
  assignee: User
  showAssignee?: boolean
  compact?: boolean
  rejectionReason?: string | null
}

export function TaskCard({ task, assignee, showAssignee, compact, rejectionReason }: TaskCardProps) {
  const router = useRouter()
  const over = isOverdue(task.dueDate)

  return (
    <div
      className={`bg-white border rounded p-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
        over ? 'border-red-200' : 'border-zinc-200'
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
      </div>

      {task.status === 'rejected' && rejectionReason && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-[12px] text-red-700 tracking-tight">
            <span className="font-medium">반려 사유: </span>{rejectionReason}
          </p>
        </div>
      )}
    </div>
  )
}
