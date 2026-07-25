'use client'

import { useMemo, useState, useTransition, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Filter, CalendarRange, MessageSquareText, LayoutDashboard, Lock } from 'lucide-react'
import type { Environment, Project, ProjectNote, SchedulePhase, Task, TaskStatus, User } from '@/types'
import { KANBAN_COLUMNS } from '@/lib/constants'
import { allowedNextStatuses } from '@/lib/transitions'
import { createTask, changeTaskStatus, changeTaskAssignee, notifyTaskNow } from '@/lib/actions'
import { useCurrentUser } from '@/components/CurrentUserProvider'
import { StatusBadge } from '@/components/badges'
import { TaskCard } from '@/components/TaskCard'
import { TaskModal, type TaskFormData } from '@/components/TaskModal'
import { RejectModal } from '@/components/RejectModal'
import { WebhookSettingField } from '@/components/WebhookSettingField'
import { SchedulePhasesModal } from '@/components/SchedulePhasesModal'
import { NewDashboardModal } from '@/components/NewDashboardModal'
import { ProjectNotesPanel } from '@/components/ProjectNotesPanel'

interface BoardViewProps {
  tasks: Task[]
  userList: User[]
  rejectionReasons: Record<string, string | null>
  webhookUrl: string | null
  phases: SchedulePhase[]
  projects: Project[]
  currentProject: Project
  notes: ProjectNote[]
}

export function BoardView({
  tasks,
  userList,
  rejectionReasons,
  webhookUrl,
  phases,
  projects,
  currentProject,
  notes,
}: BoardViewProps) {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const [envFilter, setEnvFilter] = useState<'all' | Environment>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all')
  const [blockingOnly, setBlockingOnly] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [newDashboardOpen, setNewDashboardOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
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
    if (blockingOnly && !t.isBlocking) return false
    return true
  }), [tasks, envFilter, assigneeFilter, blockingOnly])

  const doneCount = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const blockingIncomplete = tasks.filter(t => t.isBlocking && t.status !== 'done').length

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

  function handleProjectChange(projectId: string) {
    router.push(`/?project=${projectId}`)
    router.refresh()
  }

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight shrink-0">보드</h1>
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutDashboard size={13} className="text-zinc-400 shrink-0" />
            <select
              className="max-w-[220px] px-2 py-1 text-[13px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight truncate"
              value={currentProject.id}
              onChange={e => handleProjectChange(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.status === 'archived' ? ' (보관)' : ''}
                </option>
              ))}
            </select>
          </div>
          {readOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-500 border-zinc-200 tracking-tight shrink-0">
              <Lock size={10} />
              보관됨 (읽기 전용)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={() => setNotesOpen(true)}
          >
            <MessageSquareText size={13} />
            메모
            {notes.length > 0 && <span className="tabular-nums text-zinc-400">{notes.length}</span>}
          </button>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={() => setNewDashboardOpen(true)}
          >
            <LayoutDashboard size={13} />
            새 대시보드
          </button>
          {!readOnly && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
              onClick={() => setTaskModalOpen(true)}
              disabled={!currentUser}
              title={!currentUser ? '작업할 사용자를 먼저 선택해주세요' : undefined}
            >
              <Plus size={13} />
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
              className="shrink-0 w-60"
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
                      compact
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
        <NewDashboardModal
          currentProject={currentProject}
          onClose={() => setNewDashboardOpen(false)}
        />
      )}

      {notesOpen && (
        <ProjectNotesPanel
          projectId={currentProject.id}
          notes={notes}
          readOnly={readOnly}
          onClose={() => setNotesOpen(false)}
        />
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
