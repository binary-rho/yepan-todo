'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Link as LinkIcon, ExternalLink, Lock } from 'lucide-react'
import type { Comment, SchedulePhase, Task, TaskHistory, TaskStatus, User } from '@/types'
import { formatDateTime } from '@/lib/date'
import { changeTaskStatus, addComment, updateTask, notifyTaskNow } from '@/lib/actions'
import { allowedNextStatuses } from '@/lib/transitions'
import { useProjectMember } from '@/components/ProjectMemberProvider'
import { ProjectMembersButton } from '@/components/ProjectMembersButton'
import { MembershipAlert } from '@/components/MembershipAlert'
import { StatusBadge, EnvBadge } from '@/components/badges'
import { AssigneeDisplay, DueDateDisplay } from '@/components/displays'
import { RejectModal } from '@/components/RejectModal'
import { TaskModal, type TaskFormData } from '@/components/TaskModal'

interface TaskDetailViewProps {
  task: Task
  userList: User[]
  comments: Comment[]
  histories: TaskHistory[]
  screenshotUrl: string | null
  phases: SchedulePhase[]
  readOnly?: boolean
}

// 상태 전환 버튼의 라벨/스타일. (재설정 요청은 사유 입력 모달을 먼저 띄운다)
const STATUS_ACTION: Record<TaskStatus, { label: string; cls: string }> = {
  todo: { label: '할 일로 이동', cls: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50' },
  done: { label: '완료 처리', cls: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  rejected: { label: '재설정 요청', cls: 'border border-red-200 text-red-600 hover:bg-red-50' },
  in_progress: { label: '진행중', cls: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50' },
  review_requested: { label: '완료요청', cls: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50' },
}

export function TaskDetailView({ task, userList, comments, histories, screenshotUrl, phases, readOnly }: TaskDetailViewProps) {
  const router = useRouter()
  const { currentUser } = useProjectMember()
  const [commentText, setCommentText] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const assignee = userList.find(u => u.id === task.assigneeId) ?? null
  const taskComments = comments.filter(c => c.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const taskHistories = histories.filter(h => h.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latestRejection = taskHistories.filter(h => h.toStatus === 'rejected').slice(-1)[0]?.reason ?? null
  const nextStatuses = allowedNextStatuses(task.status)

  function runStatusChange(newStatus: TaskStatus, reason?: string) {
    if (!currentUser) {
      setActionError('좌측에서 내 정보를 먼저 입력해주세요.')
      return
    }
    setActionError(null)
    startTransition(async () => {
      const result = await changeTaskStatus({ taskId: task.id, toStatus: newStatus, reason: reason ?? null }, currentUser.id)
      if (!result.ok) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  function submitComment() {
    if (!commentText.trim()) return
    if (!currentUser) {
      setActionError('좌측에서 내 정보를 먼저 입력해주세요.')
      return
    }
    setActionError(null)
    startTransition(async () => {
      const result = await addComment({ taskId: task.id, body: commentText.trim() }, currentUser.id)
      if (!result.ok) {
        setActionError(result.error)
        return
      }
      setCommentText('')
      router.refresh()
    })
  }

  // 담당자가 없으면 부를 사람이 없으므로 태그 없이 채널에만 나간다(담당 지정 요청 성격).
  const notifyLabel = assignee ? '담당자에게 알림' : '채널에 알림 (담당자 미지정)'

  function handleNotify() {
    setNotifyMessage(null)
    startTransition(async () => {
      const result = await notifyTaskNow(task.id)
      if (!result.ok) {
        setNotifyMessage(result.error)
        return
      }
      setNotifyMessage(assignee ? '담당자에게 알림을 보냈습니다.' : '사람 태그 없이 채널에 알림을 보냈습니다.')
    })
  }

  async function handleEdit(data: TaskFormData) {
    const result = await updateTask(task.id, data)
    if (result.ok) {
      setShowEdit(false)
      router.refresh()
    }
    return result
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        {/* 보관된 회차의 항목이면 활성 회차가 아니라 원래 보고 있던 그 회차로 돌아가야 한다. */}
        <button
          className="flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-700 tracking-tight transition-colors"
          onClick={() => router.push(`/?project=${task.projectId}`)}
        >
          <ChevronRight size={13} className="rotate-180" />
          목록으로
        </button>
        {readOnly ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-500 border-zinc-200 tracking-tight">
            <Lock size={10} />
            보관됨 (읽기 전용)
          </span>
        ) : (
          <ProjectMembersButton />
        )}
      </div>

      {!readOnly && <MembershipAlert />}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 min-w-0">
          <div className="bg-white border border-zinc-200 rounded p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight leading-snug flex-1">{task.title}</h1>
              <div className="shrink-0"><StatusBadge status={task.status} /></div>
            </div>

            {task.status === 'rejected' && latestRejection && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded">
                <p className="text-[12px] font-medium text-red-700 tracking-tight mb-0.5">재설정 사유</p>
                <p className="text-[13px] text-red-800 tracking-tight">{latestRejection}</p>
              </div>
            )}

            {task.description && (
              <p className="text-[14px] text-zinc-600 tracking-tight leading-relaxed mb-3">{task.description}</p>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <div>
                <p className="text-zinc-400 tracking-tight text-[12px] mb-0.5">담당자</p>
                <AssigneeDisplay user={assignee} />
              </div>
              <div>
                <p className="text-zinc-400 tracking-tight text-[12px] mb-0.5">환경</p>
                <EnvBadge env={task.environment} />
              </div>
              <div>
                <p className="text-zinc-400 tracking-tight text-[12px] mb-0.5">마감일</p>
                <DueDateDisplay dueDate={task.dueDate} />
              </div>
            </div>
          </div>

          {(task.confluenceUrl || task.verifyUrl) && (
            <div className="bg-white border border-zinc-200 rounded p-4 space-y-2.5">
              {task.confluenceUrl && (
                <a
                  href={task.confluenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[13px] text-zinc-700 hover:text-zinc-900 tracking-tight group"
                >
                  <LinkIcon size={13} className="text-zinc-400 shrink-0" />
                  컨플루언스 문서
                  <ExternalLink size={11} className="text-zinc-300 group-hover:text-zinc-500" />
                </a>
              )}
              {task.verifyUrl && (
                <div>
                  <a
                    href={task.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] text-zinc-700 hover:text-zinc-900 tracking-tight group"
                  >
                    <ExternalLink size={13} className="text-zinc-400 shrink-0" />
                    확인 URL 열기
                    <ExternalLink size={11} className="text-zinc-300 group-hover:text-zinc-500" />
                  </a>
                  {task.verifyPoint && (
                    <p className="text-[12px] text-zinc-500 mt-1 ml-5 tracking-tight">{task.verifyPoint}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {screenshotUrl && (
            <div className="bg-white border border-zinc-200 rounded p-4">
              <p className="text-[12px] font-medium text-zinc-500 tracking-tight mb-2">첨부 스크린샷</p>
              <a
                href={screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[13px] text-zinc-700 hover:text-zinc-900 tracking-tight group"
              >
                <ExternalLink size={13} className="text-zinc-400 shrink-0" />
                스크린샷 보기
                <ExternalLink size={11} className="text-zinc-300 group-hover:text-zinc-500" />
              </a>
            </div>
          )}

          {!readOnly && nextStatuses.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded p-4">
              <p className="text-[12px] font-medium text-zinc-500 tracking-tight mb-3">상태 변경</p>
              <div className="flex gap-2 flex-wrap">
                {nextStatuses.map(target => {
                  const { label, cls } = STATUS_ACTION[target]
                  const onClick = target === 'rejected'
                    ? () => setShowReject(true)
                    : () => runStatusChange(target)
                  return (
                    <button
                      key={target}
                      className={`px-3 py-1.5 text-[13px] rounded transition-colors tracking-tight disabled:opacity-40 ${cls}`}
                      onClick={onClick}
                      disabled={isPending}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {actionError && (
                <p className="text-[11px] text-red-500 mt-2 tracking-tight">{actionError}</p>
              )}
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded p-4">
            <p className="text-[12px] font-medium text-zinc-500 tracking-tight mb-3">
              코멘트{taskComments.length > 0 && <span className="tabular-nums ml-1">({taskComments.length})</span>}
            </p>

            {taskComments.length > 0 && (
              <div className="space-y-4 mb-4">
                {taskComments.map(c => {
                  const author = userList.find(u => u.id === c.authorId)
                  return (
                    <div key={c.id} className="flex gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium shrink-0 mt-0.5">
                        {(author?.name ?? '??').slice(0, 2)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-medium text-zinc-900 tracking-tight">{author?.name}</span>
                          <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-[13px] text-zinc-700 tracking-tight leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!readOnly && (
              <div className="flex gap-2">
                <input
                  className="flex-1 min-w-0 px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="코멘트 입력 후 Enter..."
                />
                <button
                  className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
                  onClick={submitComment}
                  disabled={!commentText.trim() || isPending}
                >
                  전송
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded p-4">
            <p className="text-[12px] font-medium text-zinc-500 tracking-tight mb-3">변경 이력</p>

            {taskHistories.length === 0 && (
              <p className="text-[12px] text-zinc-400 tracking-tight">이력 없음</p>
            )}

            <div className="relative">
              {taskHistories.length > 1 && (
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-zinc-100" />
              )}
              <div className="space-y-4">
                {taskHistories.map(h => (
                  <div key={h.id} className="flex gap-3 relative">
                    <div className="mt-1 w-3.5 h-3.5 rounded-full bg-zinc-200 border-2 border-white shrink-0" />
                    <div className="flex-1 min-w-0 pb-0.5">
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        {h.fromStatus ? (
                          <>
                            <StatusBadge status={h.fromStatus} />
                            <ChevronRight size={10} className="text-zinc-400" />
                            <StatusBadge status={h.toStatus} />
                          </>
                        ) : (
                          <StatusBadge status={h.toStatus} />
                        )}
                      </div>
                      <p className="text-[12px] text-zinc-600 tracking-tight">{h.changedBy}</p>
                      <p className="text-[11px] text-zinc-400 tabular-nums tracking-tight">{formatDateTime(h.createdAt)}</p>
                      {h.reason && (
                        <p className="text-[12px] text-red-600 mt-1 tracking-tight leading-snug">{h.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
              <button
                className="w-full px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50 transition-colors tracking-tight disabled:opacity-40"
                onClick={handleNotify}
                disabled={isPending}
              >
                {notifyLabel}
              </button>
              {notifyMessage && (
                <p className="text-[11px] text-zinc-500 tracking-tight">{notifyMessage}</p>
              )}
              <button
                className="text-[13px] text-zinc-600 hover:text-zinc-900 tracking-tight transition-colors"
                onClick={() => setShowEdit(true)}
              >
                항목 수정
              </button>
            </div>
          )}
        </div>
      </div>

      {showReject && (
        <RejectModal
          onClose={() => setShowReject(false)}
          onConfirm={reason => { runStatusChange('rejected', reason); setShowReject(false) }}
        />
      )}

      {showEdit && (
        <TaskModal
          task={task}
          userList={userList}
          phases={phases}
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  )
}
