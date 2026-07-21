import { useState, useMemo } from 'react'
import {
  AlertCircle,
  ChevronRight,
  Check,
  X,
  Link,
  ExternalLink,
  Plus,
  FileText,
  Filter,
} from 'lucide-react'
import type { Task, TaskStatus, User, Comment, TaskHistory, Template, Environment, UserRole } from '../types/index'
import {
  users,
  tasks as mockTasks,
  taskHistories as mockHistories,
  comments as mockComments,
  templates,
  templateItems,
} from '../lib/mock-data'

// ─── Routing ────────────────────────────────────────────────────────────────

type PageView =
  | { view: 'login' }
  | { view: 'assignee' }
  | { view: 'board' }
  | { view: 'task-detail'; taskId: string }
  | { view: 'templates' }

// ─── Constants ───────────────────────────────────────────────────────────────

const TODAY = new Date('2026-07-21T00:00:00Z')

const STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  todo:             { label: '대기',    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  in_progress:      { label: '진행중',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  review_requested: { label: '완료요청', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:             { label: '완료',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:         { label: '반려',    cls: 'bg-red-50 text-red-700 border-red-200' },
}

const ENV_CONFIG: Record<Environment, { label: string; cls: string }> = {
  dev: { label: 'DEV', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  stg: { label: 'STG', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  prd: { label: 'PRD', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review_requested', 'done', 'rejected']

// ─── Utilities ───────────────────────────────────────────────────────────────

function getDday(dueDate: string | null): string | null {
  if (!dueDate) return null
  const diff = Math.ceil((new Date(dueDate).getTime() - TODAY.getTime()) / 86400000)
  if (diff === 0) return 'D-day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function isOverdue(dueDate: string | null): boolean {
  return !!dueDate && new Date(dueDate) < TODAY
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false
  const diff = Math.ceil((new Date(dueDate).getTime() - TODAY.getTime()) / 86400000)
  return diff >= 0 && diff <= 3
}

function fmtDate(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function fmtDateTime(s: string): string {
  const d = new Date(s)
  return `${fmtDate(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function initials(name: string): string {
  return name.slice(0, 2)
}

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, cls } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border tracking-tight tabular-nums ${cls}`}>
      {label}
    </span>
  )
}

function EnvBadge({ env }: { env: Environment }) {
  const { label, cls } = ENV_CONFIG[env]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border tracking-tight ${cls}`}>
      {label}
    </span>
  )
}

function BlockingBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium tracking-tight">
      <AlertCircle size={10} />
      차단
    </span>
  )
}

function DueDateDisplay({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-zinc-400 text-[13px] tabular-nums">—</span>
  const dday = getDday(dueDate)
  const over = isOverdue(dueDate)
  const soon = isDueSoon(dueDate)
  return (
    <span className={`text-[13px] tabular-nums tracking-tight ${over ? 'text-red-600 font-medium' : soon ? 'text-amber-600' : 'text-zinc-500'}`}>
      {fmtDate(dueDate)}
      {dday && <span className="ml-1 text-[11px]">({dday})</span>}
    </span>
  )
}

function AssigneeDisplay({ user }: { user: User }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium tracking-tight shrink-0">
        {initials(user.name)}
      </span>
      <span className="text-[13px] text-zinc-700 tracking-tight">{user.name}</span>
    </span>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  assignee: User
  showAssignee?: boolean
  compact?: boolean
  rejectionReason?: string | null
  onClick: () => void
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
}

function TaskCard({ task, assignee, showAssignee, compact, rejectionReason, onClick, onStatusChange }: TaskCardProps) {
  const over = isOverdue(task.dueDate)
  const isReview = task.status === 'review_requested'

  return (
    <div
      className={`bg-white border rounded p-3 cursor-pointer hover:bg-zinc-50 transition-colors ${
        over ? 'border-red-200' : isReview ? 'border-amber-300' : 'border-zinc-200'
      }`}
      onClick={onClick}
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
        {onStatusChange && task.status !== 'done' && task.status !== 'review_requested' && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {(task.status === 'todo' || task.status === 'rejected') && (
              <button
                className="text-[11px] px-2 py-0.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
                onClick={() => onStatusChange(task.id, 'in_progress')}
              >
                진행중으로 변경
              </button>
            )}
            {task.status === 'in_progress' && (
              <button
                className="text-[11px] px-2 py-0.5 border border-amber-200 rounded text-amber-700 hover:bg-amber-50 transition-colors tracking-tight"
                onClick={() => onStatusChange(task.id, 'review_requested')}
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
    </div>
  )
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)

  function submit() {
    if (!reason.trim()) { setError(true); return }
    onConfirm(reason.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">반려 사유 입력</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-4">
          <textarea
            className={`w-full px-3 py-2 border rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none ${error ? 'border-red-300' : 'border-zinc-200'}`}
            rows={4}
            value={reason}
            onChange={e => { setReason(e.target.value); setError(false) }}
            placeholder="담당자에게 전달할 반려 사유를 입력해주세요"
            autoFocus
          />
          {error && <p className="text-[11px] text-red-500 mt-0.5 tracking-tight">반려 사유를 입력해주세요</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200">
          <button className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight" onClick={onClose}>취소</button>
          <button className="px-3 py-1.5 text-[13px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors tracking-tight" onClick={submit}>반려</button>
        </div>
      </div>
    </div>
  )
}

// ─── Task Modal (Create / Edit) ───────────────────────────────────────────────

interface TaskModalProps {
  task?: Task
  userList: User[]
  onClose: () => void
  onSave: (data: Partial<Task>) => void
}

function TaskModal({ task, userList, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [desc, setDesc] = useState(task?.description ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '')
  const [env, setEnv] = useState<Environment>(task?.environment ?? 'dev')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [blocking, setBlocking] = useState(task?.isBlocking ?? false)
  const [confUrl, setConfUrl] = useState(task?.confluenceUrl ?? '')
  const [verifyUrl, setVerifyUrl] = useState(task?.verifyUrl ?? '')
  const [verifyPoint, setVerifyPoint] = useState(task?.verifyPoint ?? '')
  const [errs, setErrs] = useState<Record<string, string>>({})

  const assignees = userList.filter(u => u.role === 'assignee')

  function submit() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = '제목을 입력해주세요'
    if (!assigneeId) e.assigneeId = '담당자를 선택해주세요'
    if (Object.keys(e).length) { setErrs(e); return }
    onSave({
      title: title.trim(),
      description: desc.trim() || null,
      assigneeId,
      environment: env,
      dueDate: dueDate || null,
      isBlocking: blocking,
      confluenceUrl: confUrl.trim() || null,
      verifyUrl: verifyUrl.trim() || null,
      verifyPoint: verifyPoint.trim() || null,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">마감일</label>
              <input
                type="date"
                className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-0"
                  checked={blocking}
                  onChange={e => setBlocking(e.target.checked)}
                />
                <span className="text-[13px] text-zinc-600 tracking-tight">차단 항목으로 표시</span>
              </label>
            </div>
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
          <button className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight" onClick={submit}>
            {task ? '저장' : '생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template Use Modal ───────────────────────────────────────────────────────

function TemplateUseModal({ template, onClose, onConfirm }: {
  template: Template
  onClose: () => void
  onConfirm: (env: Environment, baseDate: string) => void
}) {
  const [env, setEnv] = useState<Environment>('dev')
  const [baseDate, setBaseDate] = useState('')

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">템플릿으로 항목 생성</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="p-4 space-y-3">
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
          <button className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight" onClick={() => onConfirm(env, baseDate)}>생성</button>
        </div>
      </div>
    </div>
  )
}

// ─── Login View ───────────────────────────────────────────────────────────────

function LoginView({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="bg-white border border-zinc-200 rounded p-8 w-full max-w-sm">
          <div className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center mb-4">
            <Check size={14} className="text-emerald-600" />
          </div>
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">메일을 확인해주세요</h1>
          <p className="text-[13px] text-zinc-500 mt-1 tracking-tight">{email} 로 로그인 링크를 발송했습니다.</p>

          <div className="mt-5 pt-4 border-t border-zinc-100">
            <p className="text-[11px] text-zinc-400 tracking-tight mb-2 font-medium uppercase">개발용 빠른 로그인</p>
            <div className="space-y-1.5">
              {users.map(u => (
                <button
                  key={u.id}
                  className="w-full text-left px-3 py-2 text-[13px] border border-zinc-200 rounded hover:bg-zinc-50 transition-colors tracking-tight flex items-center justify-between"
                  onClick={() => onLogin(u)}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium">{initials(u.name)}</span>
                    <span className="text-zinc-800">{u.name}</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">{u.role === 'admin' ? '관리자' : '담당자'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="bg-white border border-zinc-200 rounded p-8 w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">BO 세팅 관리</h1>
          <p className="text-[13px] text-zinc-500 mt-1 tracking-tight">이메일로 로그인 링크를 받아 접속합니다.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-zinc-600 tracking-tight mb-1">이메일</label>
            <input
              type="email"
              className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email.trim() && setSent(true)}
              placeholder="name@telecom.co.kr"
              autoFocus
            />
          </div>
          <button
            className="w-full py-2 bg-zinc-900 text-white rounded text-[13px] font-medium hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
            onClick={() => setSent(true)}
            disabled={!email.trim()}
          >
            로그인 링크 전송
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Assignee View ────────────────────────────────────────────────────────────

interface AssigneeViewProps {
  currentUser: User
  userList: User[]
  tasks: Task[]
  histories: TaskHistory[]
  onTaskClick: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

function AssigneeView({ currentUser, userList, tasks, histories, onTaskClick, onStatusChange }: AssigneeViewProps) {
  const mine = tasks.filter(t => t.assigneeId === currentUser.id && t.status !== 'done')
  const overdue = mine.filter(t => isOverdue(t.dueDate))
  const rest = mine.filter(t => !isOverdue(t.dueDate))

  function latestRejection(taskId: string): string | null {
    return [...histories]
      .filter(h => h.taskId === taskId && h.toStatus === 'rejected')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.reason ?? null
  }

  if (mine.length === 0) {
    return (
      <div className="px-6 py-6">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight mb-4">내 할 일</h1>
        <div className="border border-dashed border-zinc-200 rounded p-10 text-center">
          <p className="text-[14px] text-zinc-500 tracking-tight">처리할 항목이 없습니다.</p>
          <p className="text-[13px] text-zinc-400 mt-1 tracking-tight">모든 세팅 항목이 완료되었습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">내 할 일</h1>
        <div className="flex items-center gap-4 text-[13px] tabular-nums">
          <span className="text-zinc-500 tracking-tight">미완료 <span className="font-medium text-zinc-900">{mine.length}</span>건</span>
          {overdue.length > 0 && (
            <span className="text-red-600 tracking-tight font-medium">{overdue.length}건 마감 초과</span>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={12} className="text-red-500" />
            <span className="text-[12px] font-medium text-red-600 tracking-tight">마감 초과</span>
          </div>
          <div className="space-y-2">
            {overdue.map(task => {
              const assignee = userList.find(u => u.id === task.assigneeId)!
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={assignee}
                  rejectionReason={latestRejection(task.id)}
                  onClick={() => onTaskClick(task.id)}
                  onStatusChange={onStatusChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {overdue.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12px] font-medium text-zinc-500 tracking-tight">진행 중</span>
            </div>
          )}
          <div className="space-y-2">
            {rest.map(task => {
              const assignee = userList.find(u => u.id === task.assigneeId)!
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={assignee}
                  rejectionReason={latestRejection(task.id)}
                  onClick={() => onTaskClick(task.id)}
                  onStatusChange={onStatusChange}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Board View ───────────────────────────────────────────────────────────────

interface BoardViewProps {
  tasks: Task[]
  userList: User[]
  histories: TaskHistory[]
  onTaskClick: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onCreateTask: () => void
  onTemplates: () => void
}

function BoardView({ tasks, userList, histories, onTaskClick, onStatusChange, onCreateTask, onTemplates }: BoardViewProps) {
  const [envFilter, setEnvFilter] = useState<'all' | Environment>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all')
  const [blockingOnly, setBlockingOnly] = useState(false)

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

  function latestRejection(taskId: string): string | null {
    return [...histories]
      .filter(h => h.taskId === taskId && h.toStatus === 'rejected')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.reason ?? null
  }

  return (
    <div className="px-6 py-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">전체 보드</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={onTemplates}
          >
            <FileText size={13} />
            템플릿
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight"
            onClick={onCreateTask}
          >
            <Plus size={13} />
            새 항목
          </button>
        </div>
      </div>

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
                      rejectionReason={latestRejection(task.id)}
                      onClick={() => onTaskClick(task.id)}
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
    </div>
  )
}

// ─── Task Detail View ─────────────────────────────────────────────────────────

interface TaskDetailViewProps {
  task: Task
  userList: User[]
  comments: Comment[]
  histories: TaskHistory[]
  currentUser: User
  onStatusChange: (id: string, status: TaskStatus, reason?: string) => void
  onAddComment: (taskId: string, authorId: string, body: string) => void
  onEdit: (task: Task) => void
  onBack: () => void
}

function TaskDetailView({ task, userList, comments, histories, currentUser, onStatusChange, onAddComment, onEdit, onBack }: TaskDetailViewProps) {
  // [DEV] 개발용 역할 전환 토글 - 실제 인증 연결 시 이 블록 전체 제거
  const [devRole, setDevRole] = useState<UserRole>(currentUser.role)

  const [commentText, setCommentText] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [screenshotNote, setScreenshotNote] = useState('')

  const assignee = userList.find(u => u.id === task.assigneeId)!
  const taskComments = comments.filter(c => c.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const taskHistories = histories.filter(h => h.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const latestRejection = taskHistories.filter(h => h.toStatus === 'rejected').slice(-1)[0]?.reason ?? null

  function addComment() {
    if (!commentText.trim()) return
    onAddComment(task.id, currentUser.id, commentText.trim())
    setCommentText('')
  }

  return (
    <div className="px-6 py-6">
      <button
        className="flex items-center gap-1 text-[13px] text-zinc-500 hover:text-zinc-700 mb-4 tracking-tight transition-colors"
        onClick={onBack}
      >
        <ChevronRight size={13} className="rotate-180" />
        목록으로
      </button>

      {/* [DEV] 개발용 역할 전환 - 실제 인증 연결 후 제거 */}
      <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-amber-700 tracking-tight">[DEV]</span>
        <span className="text-[12px] text-amber-700 tracking-tight">역할 전환:</span>
        <select
          className="text-[12px] border border-amber-300 rounded px-1.5 py-0.5 bg-white text-amber-900 outline-none tracking-tight"
          value={devRole}
          onChange={e => setDevRole(e.target.value as UserRole)}
        >
          <option value="admin">관리자 (박지수)</option>
          <option value="assignee">담당자 ({assignee.name})</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 min-w-0">
          <div className="bg-white border border-zinc-200 rounded p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight leading-snug flex-1">{task.title}</h1>
              <div className="shrink-0"><StatusBadge status={task.status} /></div>
            </div>

            {task.status === 'rejected' && latestRejection && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded">
                <p className="text-[12px] font-medium text-red-700 tracking-tight mb-0.5">반려 사유</p>
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
              <div>
                <p className="text-zinc-400 tracking-tight text-[12px] mb-0.5">차단 여부</p>
                {task.isBlocking ? <BlockingBadge /> : <span className="text-zinc-400">—</span>}
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
                  <Link size={13} className="text-zinc-400 shrink-0" />
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

          {task.status !== 'done' && (
            <div className="bg-white border border-zinc-200 rounded p-4">
              <p className="text-[12px] font-medium text-zinc-500 tracking-tight mb-3">상태 변경</p>

              {(task.status === 'todo' || task.status === 'rejected') && (
                <button
                  className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50 transition-colors tracking-tight"
                  onClick={() => onStatusChange(task.id, 'in_progress')}
                >
                  진행중으로 변경
                </button>
              )}

              {task.status === 'in_progress' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] text-zinc-500 tracking-tight mb-1">스크린샷 첨부 <span className="text-zinc-400">(선택)</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                      value={screenshotNote}
                      onChange={e => setScreenshotNote(e.target.value)}
                      placeholder="스크린샷 URL 또는 메모"
                    />
                  </div>
                  <button
                    className="px-3 py-1.5 text-[13px] border border-amber-300 rounded text-amber-700 hover:bg-amber-50 transition-colors tracking-tight"
                    onClick={() => onStatusChange(task.id, 'review_requested')}
                  >
                    완료 요청
                  </button>
                </div>
              )}

              {task.status === 'review_requested' && devRole === 'admin' && (
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 text-[13px] bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors tracking-tight"
                    onClick={() => onStatusChange(task.id, 'done')}
                  >
                    승인
                  </button>
                  <button
                    className="px-3 py-1.5 text-[13px] border border-red-200 rounded text-red-600 hover:bg-red-50 transition-colors tracking-tight"
                    onClick={() => setShowReject(true)}
                  >
                    반려
                  </button>
                </div>
              )}

              {task.status === 'review_requested' && devRole === 'assignee' && (
                <p className="text-[13px] text-zinc-500 tracking-tight">완료 요청이 접수되었습니다. 관리자 검토를 기다리고 있습니다.</p>
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
                        {initials(author?.name ?? '??')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-medium text-zinc-900 tracking-tight">{author?.name}</span>
                          <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight">{fmtDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-[13px] text-zinc-700 tracking-tight leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 min-w-0 px-3 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment()}
                placeholder="코멘트 입력 후 Enter..."
              />
              <button
                className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
                onClick={addComment}
                disabled={!commentText.trim()}
              >
                전송
              </button>
            </div>
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
                      <p className="text-[11px] text-zinc-400 tabular-nums tracking-tight">{fmtDateTime(h.createdAt)}</p>
                      {h.reason && (
                        <p className="text-[12px] text-red-600 mt-1 tracking-tight leading-snug">{h.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded p-4">
            <button
              className="text-[13px] text-zinc-600 hover:text-zinc-900 tracking-tight transition-colors"
              onClick={() => onEdit(task)}
            >
              항목 수정
            </button>
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          onClose={() => setShowReject(false)}
          onConfirm={reason => { onStatusChange(task.id, 'rejected', reason); setShowReject(false) }}
        />
      )}
    </div>
  )
}

// ─── Templates View ───────────────────────────────────────────────────────────

function TemplatesView({ templateList }: { templateList: Template[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [useModal, setUseModal] = useState<Template | null>(null)

  return (
    <div className="px-6 py-6">
      <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight mb-5">템플릿</h1>

      <div className="space-y-3 max-w-xl">
        {templateList.map(tpl => (
          <div
            key={tpl.id}
            className={`bg-white border rounded transition-colors ${expanded === tpl.id ? 'border-zinc-400' : 'border-zinc-200'}`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors rounded"
              onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-zinc-900 tracking-tight">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">{tpl.description}</p>
                  )}
                  <p className="text-[12px] text-zinc-400 mt-1 tabular-nums tracking-tight">항목 {tpl.itemCount}개</p>
                </div>
                <button
                  className="shrink-0 px-3 py-1.5 text-[12px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight"
                  onClick={e => { e.stopPropagation(); setUseModal(tpl) }}
                >
                  이 템플릿으로 생성
                </button>
              </div>
            </div>

            {expanded === tpl.id && (
              <div className="px-4 pb-4 border-t border-zinc-100">
                <p className="text-[12px] font-medium text-zinc-500 tracking-tight mt-3 mb-2">포함 항목</p>
                <div className="space-y-1">
                  {(templateItems[tpl.id] ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b border-zinc-50 last:border-0">
                      <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight w-4 shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="text-[13px] text-zinc-700 tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {useModal && (
        <TemplateUseModal
          template={useModal}
          onClose={() => setUseModal(null)}
          onConfirm={() => setUseModal(null)}
        />
      )}
    </div>
  )
}

// ─── Navigation ───────────────────────────────────────────────────────────────

interface NavProps {
  page: PageView
  currentUser: User
  onNavigate: (p: PageView) => void
  onLogout: () => void
}

function Nav({ page, currentUser, onNavigate, onLogout }: NavProps) {
  const isAdmin = currentUser.role === 'admin'
  const active = page.view

  const items = [
    { label: '내 할 일', view: 'assignee' as const, show: true },
    { label: '전체 보드', view: 'board' as const, show: isAdmin },
    { label: '템플릿', view: 'templates' as const, show: isAdmin },
  ]

  return (
    <aside className="w-44 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-zinc-100">
        <p className="text-[13px] font-semibold text-zinc-900 tracking-tight">BO 세팅 관리</p>
      </div>

      <nav className="flex-1 px-2 py-2">
        {items.filter(i => i.show).map(item => (
          <button
            key={item.view}
            className={`w-full text-left px-3 py-1.5 text-[13px] rounded tracking-tight transition-colors mb-0.5 ${
              active === item.view
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
            onClick={() => onNavigate({ view: item.view })}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium shrink-0">
            {initials(currentUser.name)}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 tracking-tight truncate">{currentUser.name}</p>
            <p className="text-[11px] text-zinc-400 tracking-tight">{currentUser.role === 'admin' ? '관리자' : '담당자'}</p>
          </div>
        </div>
        <button
          className="text-[12px] text-zinc-400 hover:text-zinc-600 tracking-tight transition-colors"
          onClick={onLogout}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<PageView>({ view: 'login' })
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [histories, setHistories] = useState<TaskHistory[]>(mockHistories)
  const [comments, setComments] = useState<Comment[]>(mockComments)
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false })

  function login(user: User) {
    setCurrentUser(user)
    setPage(user.role === 'admin' ? { view: 'board' } : { view: 'assignee' })
  }

  function logout() {
    setCurrentUser(null)
    setPage({ view: 'login' })
  }

  function statusChange(taskId: string, newStatus: TaskStatus, reason?: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const h: TaskHistory = {
      id: `h_${Date.now()}`,
      taskId,
      fromStatus: task.status,
      toStatus: newStatus,
      changedBy: currentUser?.name ?? '알 수 없음',
      reason: reason ?? null,
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    setHistories(prev => [...prev, h])
  }

  function addComment(taskId: string, authorId: string, body: string) {
    setComments(prev => [...prev, {
      id: `c_${Date.now()}`,
      taskId,
      authorId,
      body,
      createdAt: new Date().toISOString(),
    }])
  }

  function saveTask(data: Partial<Task>) {
    if (taskModal.task) {
      setTasks(prev => prev.map(t => t.id === taskModal.task!.id
        ? { ...t, ...data, updatedAt: new Date().toISOString() }
        : t
      ))
    } else {
      const id = `t_${Date.now()}`
      const newTask: Task = {
        id,
        title: data.title ?? '',
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? '',
        status: 'todo',
        environment: data.environment ?? 'dev',
        dueDate: data.dueDate ?? null,
        isBlocking: data.isBlocking ?? false,
        confluenceUrl: data.confluenceUrl ?? null,
        verifyUrl: data.verifyUrl ?? null,
        verifyPoint: data.verifyPoint ?? null,
        screenshotUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setTasks(prev => [...prev, newTask])
      setHistories(prev => [...prev, {
        id: `h_${Date.now()}`,
        taskId: id,
        fromStatus: null,
        toStatus: 'todo',
        changedBy: currentUser?.name ?? '알 수 없음',
        reason: null,
        createdAt: new Date().toISOString(),
      }])
    }
    setTaskModal({ open: false })
  }

  if (!currentUser) {
    return <LoginView onLogin={login} />
  }

  const currentTask = page.view === 'task-detail'
    ? tasks.find(t => t.id === page.taskId)
    : undefined

  const backPage: PageView = currentUser.role === 'admin' ? { view: 'board' } : { view: 'assignee' }

  return (
    <div className="flex min-h-screen bg-background font-[Pretendard,system-ui,sans-serif]">
      <Nav
        page={page}
        currentUser={currentUser}
        onNavigate={setPage}
        onLogout={logout}
      />

      <main className="flex-1 overflow-auto min-w-0">
        {page.view === 'assignee' && (
          <AssigneeView
            currentUser={currentUser}
            userList={users}
            tasks={tasks}
            histories={histories}
            onTaskClick={taskId => setPage({ view: 'task-detail', taskId })}
            onStatusChange={statusChange}
          />
        )}

        {page.view === 'board' && (
          <BoardView
            tasks={tasks}
            userList={users}
            histories={histories}
            onTaskClick={taskId => setPage({ view: 'task-detail', taskId })}
            onStatusChange={statusChange}
            onCreateTask={() => setTaskModal({ open: true })}
            onTemplates={() => setPage({ view: 'templates' })}
          />
        )}

        {page.view === 'task-detail' && currentTask && (
          <TaskDetailView
            task={currentTask}
            userList={users}
            comments={comments}
            histories={histories}
            currentUser={currentUser}
            onStatusChange={statusChange}
            onAddComment={addComment}
            onEdit={task => setTaskModal({ open: true, task })}
            onBack={() => setPage(backPage)}
          />
        )}

        {page.view === 'templates' && (
          <TemplatesView templateList={templates} />
        )}
      </main>

      {taskModal.open && (
        <TaskModal
          task={taskModal.task}
          userList={users}
          onClose={() => setTaskModal({ open: false })}
          onSave={saveTask}
        />
      )}
    </div>
  )
}
