'use client'

import { useMemo, useState, useTransition, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Filter, CalendarRange, LayoutDashboard, Lock } from 'lucide-react'
import type { Environment, Project, ProjectNote, SchedulePhase, Task, TaskStatus, User } from '@/types'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { allowedNextStatuses } from '@/lib/transitions'
import { createTask, changeTaskStatus, changeTaskAssignee, notifyTaskNow } from '@/lib/actions'
import { useCurrentUser } from '@/components/CurrentUserProvider'
import { CurrentUserPicker } from '@/components/CurrentUserPicker'
import { StatusBadge } from '@/components/badges'
import { TaskCard } from '@/components/TaskCard'
import { TaskModal, type TaskFormData } from '@/components/TaskModal'
import { RejectModal } from '@/components/RejectModal'
import { WebhookSettingField } from '@/components/WebhookSettingField'
import { SchedulePhasesModal } from '@/components/SchedulePhasesModal'
import { NewDashboardModal } from '@/components/NewDashboardModal'
import { ProjectNotesPanel } from '@/components/ProjectNotesPanel'

// 카드가 눌려서 찌그러지지 않도록 컬럼 폭을 고정한다. 화면이 좁으면(축소가 아니라) 가로 스크롤이 생긴다.
const COLUMN_WIDTH_CLASS = 'w-72 shrink-0'

interface BoardViewProps {
  tasks: Task[]
  userList: User[]
  rejectionReasons: Record<string, string | null>
  webhookUrl: string | null
  phases: SchedulePhase[]
  currentProject: Project
  notes: ProjectNote[]
}

export function BoardView({
  tasks,
  userList,
  rejectionReasons,
  webhookUrl,
  phases,
  currentProject,
  notes,
}: BoardViewProps) {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const [envFilter, setEnvFilter] = useState<'all' | Environment>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [newDashboardOpen, setNewDashboardOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const readOnly = currentProject.status === 'archived'
  const assignees = userList

  const filtered = useMemo(() => tasks.filter(t => {
    if (envFilter !== 'all' && t.environment !== envFilter) return false
    if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false
    return true
  }), [tasks, envFilter, assigneeFilter])

  const doneCount = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  async function handleCreate(data: TaskFormData) {
    if (!currentUser) return { ok: false as const, error: '작업할 사용자를 먼저 선택해주세요.' }
    const result = await createTask(currentProject.id, data, currentUser.id)
    if (result.ok) {
      setTaskModalOpen(false)
      router.refresh()
    }
    return result
  }

  function runMove(taskId: string, toStatus: TaskStatus, reason?: string) {
    if (!currentUser) {
      setMoveError('작업할 사용자를 먼저 선택해주세요.')
      return
    }
    setMoveError(null)
    startTransition(async () => {
      const result = await changeTaskStatus({ taskId, toStatus, reason: reason ?? null }, currentUser.id)
      if (!result.ok) {
        setMoveError(result.error)
        return
      }
      router.refresh()
    })
  }

  // 카드를 특정 컬럼(상태)으로 이동. 반려로 옮길 때는 사유 입력 모달을 먼저 띄운다.
  function moveToStatus(taskId: string, toStatus: TaskStatus) {
    if (readOnly) return
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === toStatus) return
    if (!allowedNextStatuses(task.status).includes(toStatus)) return
    if (toStatus === 'rejected') {
      setPendingRejectId(taskId)
      return
    }
    runMove(taskId, toStatus)
  }

  function handleDrop(status: TaskStatus, e: DragEvent) {
    e.preventDefault()
    const id = draggingId ?? e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    setDragOverStatus(null)
    if (id) moveToStatus(id, status)
  }

  async function handleAssigneeChange(taskId: string, assigneeId: string) {
    const result = await changeTaskAssignee(taskId, assigneeId)
    if (result.ok) router.refresh()
    return result
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 px-6 py-6 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-4 gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight shrink-0">보드</h1>
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <LayoutDashboard size={13} className="text-zinc-400 shrink-0" />
            <span className="text-[13px] font-medium text-zinc-700 tracking-tight truncate max-w-[220px]">
              {currentProject.name}
            </span>
          </div>
          {readOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-500 border-zinc-200 tracking-tight shrink-0">
              <Lock size={10} />
              보관됨 (읽기 전용)
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {!readOnly && <CurrentUserPicker />}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 whitespace-nowrap"
            onClick={() => setScheduleModalOpen(true)}
          >
            <CalendarRange size={13} className="shrink-0" />
            일정
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 whitespace-nowrap"
            onClick={() => router.push('/templates')}
          >
            <FileText size={13} className="shrink-0" />
            템플릿
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 whitespace-nowrap"
            onClick={() => setNewDashboardOpen(true)}
          >
            <LayoutDashboard size={13} className="shrink-0" />
            새 대시보드
          </button>
          {!readOnly && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40 shrink-0 whitespace-nowrap"
              onClick={() => setTaskModalOpen(true)}
              disabled={!currentUser}
              title={!currentUser ? '작업할 사용자를 먼저 선택해주세요' : undefined}
            >
              <Plus size={13} className="shrink-0" />
              새 항목
            </button>
          )}
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
      </div>

      {moveError && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded">
          <p className="text-[12px] text-red-700 tracking-tight">{moveError}</p>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2 flex-1" style={{ minHeight: 0 }}>
        {KANBAN_COLUMNS.map(status => {
          const colTasks = filtered.filter(t => t.status === status)
          const isDropTarget = !readOnly && dragOverStatus === status
          return (
            <div
              key={status}
              className={COLUMN_WIDTH_CLASS}
              onDragOver={e => { if (readOnly) return; e.preventDefault(); setDragOverStatus(status) }}
              onDragLeave={e => { if (e.currentTarget === e.target) setDragOverStatus(null) }}
              onDrop={e => handleDrop(status, e)}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <StatusBadge status={status} />
                <span className="text-[12px] text-zinc-400 tabular-nums tracking-tight">{colTasks.length}</span>
              </div>
              <div
                className={`space-y-2 rounded transition-colors min-h-[60px] ${
                  isDropTarget ? 'bg-zinc-100 outline outline-1 outline-dashed outline-zinc-300 p-1' : ''
                }`}
              >
                {colTasks.map(task => {
                  const assignee = userList.find(u => u.id === task.assigneeId)!
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      assignee={assignee}
                      showAssignee
                      rejectionReason={rejectionReasons[task.id] ?? null}
                      draggable={!readOnly}
                      dragging={draggingId === task.id}
                      onDragStart={e => {
                        setDraggingId(task.id)
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', task.id)
                      }}
                      onDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                      assignees={assignees}
                      readOnly={readOnly}
                      onMove={status => moveToStatus(task.id, status)}
                      onAssigneeChange={assigneeId => handleAssigneeChange(task.id, assigneeId)}
                      onNotify={() => notifyTaskNow(task.id)}
                    />
                  )
                })}
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-zinc-200 rounded p-4 text-center">
                    <span className="text-[12px] text-zinc-300 tracking-tight">
                      {isDropTarget ? '여기로 이동' : '없음'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>

      <ProjectNotesPanel projectId={currentProject.id} notes={notes} readOnly={readOnly} />

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

      {newDashboardOpen && (
        <NewDashboardModal onClose={() => setNewDashboardOpen(false)} />
      )}

      {pendingRejectId && (
        <RejectModal
          onClose={() => setPendingRejectId(null)}
          onConfirm={reason => {
            const id = pendingRejectId
            setPendingRejectId(null)
            runMove(id, 'rejected', reason)
          }}
        />
      )}
    </div>
  )
}
