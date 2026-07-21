'use server'

import { revalidatePath } from 'next/cache'
import type { Task, TaskHistory } from '@/types'
import { getCurrentUser } from '@/lib/auth'
import { validateTransition } from '@/lib/transitions'
import {
  taskInputSchema,
  statusChangeSchema,
  commentSchema,
  templateUseSchema,
} from '@/lib/validation'
import {
  users,
  tasks,
  taskHistories,
  comments,
  templateItems,
} from '@/lib/mock-data'

// TODO(supabase): Server Actions 단계에서 Supabase 쓰기로 교체한다.
// 반환 타입과 인자 형태는 유지한다.

export type ActionResult = { ok: true } | { ok: false; error: string }

function nowIso(): string {
  return new Date().toISOString()
}

function recordHistory(entry: Omit<TaskHistory, 'id' | 'createdAt'>): void {
  taskHistories.push({ id: crypto.randomUUID(), createdAt: nowIso(), ...entry })
}

export async function changeTaskStatus(input: {
  taskId: string
  toStatus: string
  reason?: string | null
}): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '로그인이 필요합니다.' }

  const parsed = statusChangeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const task = tasks.find((t) => t.id === parsed.data.taskId)
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  if (user.role === 'assignee' && task.assigneeId !== user.id) {
    return { ok: false, error: '담당자만 이 항목을 변경할 수 있습니다.' }
  }

  const reason = parsed.data.reason ?? null
  const check = validateTransition(task.status, parsed.data.toStatus, user.role, reason)
  if (!check.ok) return { ok: false, error: check.reason }

  recordHistory({
    taskId: task.id,
    fromStatus: task.status,
    toStatus: parsed.data.toStatus,
    changedBy: user.name,
    reason,
  })
  task.status = parsed.data.toStatus
  task.updatedAt = nowIso()

  revalidatePath('/')
  revalidatePath('/board')
  revalidatePath(`/tasks/${task.id}`)
  return { ok: true }
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { ok: false, error: '관리자만 항목을 생성할 수 있습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const id = crypto.randomUUID()
  const task: Task = {
    id,
    ...parsed.data,
    status: 'todo',
    screenshotUrl: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  tasks.push(task)
  recordHistory({ taskId: id, fromStatus: null, toStatus: 'todo', changedBy: user.name, reason: null })

  revalidatePath('/')
  revalidatePath('/board')
  return { ok: true }
}

export async function updateTask(taskId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { ok: false, error: '관리자만 항목을 수정할 수 있습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const task = tasks.find((t) => t.id === taskId)
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  Object.assign(task, parsed.data, { updatedAt: nowIso() })

  revalidatePath('/')
  revalidatePath('/board')
  revalidatePath(`/tasks/${taskId}`)
  return { ok: true }
}

export async function addComment(input: { taskId: string; body: string }): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '로그인이 필요합니다.' }

  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  comments.push({
    id: crypto.randomUUID(),
    taskId: parsed.data.taskId,
    authorId: user.id,
    body: parsed.data.body,
    createdAt: nowIso(),
  })

  revalidatePath(`/tasks/${parsed.data.taskId}`)
  return { ok: true }
}

export async function createTasksFromTemplate(input: {
  templateId: string
  environment: string
  baseDate: string
}): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { ok: false, error: '관리자만 템플릿으로 생성할 수 있습니다.' }

  const parsed = templateUseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const items = templateItems[parsed.data.templateId] ?? []
  if (items.length === 0) return { ok: false, error: '템플릿에 항목이 없습니다.' }

  const defaultAssignee = users.find((u) => u.role === 'assignee')
  if (!defaultAssignee) return { ok: false, error: '담당자가 없습니다.' }

  const dueDate = parsed.data.baseDate
  for (const title of items) {
    const id = crypto.randomUUID()
    tasks.push({
      id,
      title,
      description: null,
      assigneeId: defaultAssignee.id,
      status: 'todo',
      environment: parsed.data.environment as Task['environment'],
      dueDate,
      isBlocking: false,
      confluenceUrl: null,
      verifyUrl: null,
      verifyPoint: null,
      screenshotUrl: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    recordHistory({ taskId: id, fromStatus: null, toStatus: 'todo', changedBy: user.name, reason: null })
  }

  revalidatePath('/')
  revalidatePath('/board')
  return { ok: true }
}
