'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Filter, CalendarRange } from 'lucide-react'
import type { Environment, SchedulePhase, Task, User } from '@/types'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { createTask } from '@/lib/actions'
import { StatusBadge } from '@/components/badges'
import { TaskCard } from '@/components/TaskCard'
import { TaskModal, type TaskFormData } from '@/components/TaskModal'
import { WebhookSettingField } from '@/components/WebhookSettingField'
import { SchedulePhasesModal } from '@/components/SchedulePhasesModal'

interface BoardViewProps {
  tasks: Task[]
  userList: User[]
  rejectionReasons: Record<string, string | null>
  webhookUrl: string | null
  phases: SchedulePhase[]
}

export function BoardView({ tasks, userList, rejectionReasons, webhookUrl, phases }: BoardViewProps) {
  const router = useRouter()
  const [envFilter, setEnvFilter] = useState<'all' | Environment>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all')
  const [blockingOnly, setBlockingOnly] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)

  const assignees = userList.filter(u => u.role === 'assignee')

  const filtered = useMemo(() => tasks.filter(t => {
    if (envFilter !== 'all' && t.environment !== envFilter) return false
    if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false
    if (blockingOnly && !t.isBlocking) return false
    return true
  }), [tasks, envFilter, assigneeFilter, blockingOnly])

  const doneCount = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const blockingIncomplete = tasks.filter(t => t.isBlocking && t.status !== 'done').length

  async function handleCreate(data: TaskFormData) {
    const result = await createTask(data)
    if (result.ok) {
      setTaskModalOpen(false)
      router.refresh()
    }
    return result
  }

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">전체 보드</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={() => setScheduleModalOpen(true)}
          >
            <CalendarRange size={13} />
            일정
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={() => router.push('/templates')}
          >
            <FileText size={13} />
            템플릿
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight"
            onClick={() => setTaskModalOpen(true)}
          >
            <Plus size={13} />
            새 항목
          </button>
        </div>
      </div>

      <WebhookSettingField initialUrl={webhookUrl} />

      <div className="bg-white border border-zinc-200 rounded p-3 mb-4 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-zinc-500 tracking-tight">전체 진척률</span>
            <span className="text-[12px] font-medium text-zinc-900 tabular-nums tracking-tight">{progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4 text-[13px] tabular-nums pl-4 border-l border-zinc-100 shrink-0">
          <span className="text-zinc-500 tracking-tight">전체 <span className="font-medium text-zinc-900">{tasks.length}</span>건</span>
          {blockingIncomplete > 0 && (
            <span className="text-red-600 tracking-tight">미완료 차단 <span className="font-medium">{blockingIncomplete}</span>건</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={12} className="text-zinc-400" />
        <select
          className="px-2 py-1 text-[12px] border border-zinc-200 rounded text-zinc-600 bg-white outline-none tracking-tight"
          value={envFilter}
          onChange={e => setEnvFilter(e.target.value as 'all' | Environment)}
        >
          <option value="all">전체 환경</option>
          <option value="dev">DEV</option>
          <option value="stg">STG</option>
          <option value="prd">PRD</option>
        </select>
        <select
          className="px-2 py-1 text-[12px] border border-zinc-200 rounded text-zinc-600 bg-white outline-none tracking-tight"
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
        >
          <option value="all">전체 담당자</option>
          {assignees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            className="w-3 h-3 rounded border-zinc-300 focus:ring-0"
            checked={blockingOnly}
            onChange={e => setBlockingOnly(e.target.checked)}
          />
          <span className="text-[12px] text-zinc-600 tracking-tight">차단 항목만</span>
        </label>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 flex-1" style={{ minHeight: 0 }}>
        {KANBAN_COLUMNS.map(status => {
          const colTasks = filtered.filter(t => t.status === status)
          return (
            <div key={status} className="shrink-0 w-60">
              <div className="flex items-center gap-1.5 mb-2">
                <StatusBadge status={status} />
                <span className="text-[12px] text-zinc-400 tabular-nums tracking-tight">{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.map(task => {
                  const assignee = userList.find(u => u.id === task.assigneeId)!
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assignee={assignee}
                      showAssignee
                      compact
                      rejectionReason={rejectionReasons[task.id] ?? null}
                    />
                  )
                })}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-zinc-200 rounded p-4 text-center">
                    <span className="text-[12px] text-zinc-300 tracking-tight">없음</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {taskModalOpen && (
        <TaskModal
          userList={userList}
          phases={phases}
          onClose={() => setTaskModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {scheduleModalOpen && (
        <SchedulePhasesModal
          phases={phases}
          onClose={() => setScheduleModalOpen(false)}
          onSaved={() => {
            setScheduleModalOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
