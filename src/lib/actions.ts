'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateTransition } from '@/lib/transitions'
import { toTaskInsert, toTaskUpdate } from '@/lib/db/mappers'
import {
  taskInputSchema,
  statusChangeSchema,
  commentSchema,
  templateUseSchema,
} from '@/lib/validation'
import type { TaskStatus } from '@/types'

export type ActionResult = { ok: true } | { ok: false; error: string }

function revalidateBoards(taskId?: string): void {
  revalidatePath('/')
  revalidatePath('/board')
  if (taskId) revalidatePath(`/tasks/${taskId}`)
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

  const supabase = createSupabaseServerClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, status, assignee_id')
    .eq('id', parsed.data.taskId)
    .maybeSingle()
  if (!task) return { ok: false, error: '항목을 찾을 수 없거나 접근 권한이 없습니다.' }

  const reason = parsed.data.reason?.trim() || null
  const check = validateTransition(task.status, parsed.data.toStatus as TaskStatus, user.role, reason)
  if (!check.ok) return { ok: false, error: check.reason }

  const { error: historyError } = await supabase.from('task_history').insert({
    task_id: task.id,
    from_status: task.status,
    to_status: parsed.data.toStatus as TaskStatus,
    changed_by: user.id,
    reason,
  })
  if (historyError) return { ok: false, error: '상태 변경 이력 기록에 실패했습니다.' }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: parsed.data.toStatus as TaskStatus })
    .eq('id', task.id)
  if (updateError) return { ok: false, error: '상태 변경에 실패했습니다.' }

  revalidateBoards(task.id)
  return { ok: true }
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { ok: false, error: '관리자만 항목을 생성할 수 있습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseServerClient()
  const { data: created, error } = await supabase
    .from('tasks')
    .insert(toTaskInsert(parsed.data, parsed.data.assigneeId))
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: '항목 생성에 실패했습니다.' }

  await supabase.from('task_history').insert({
    task_id: created.id,
    from_status: null,
    to_status: 'todo',
    changed_by: user.id,
    reason: null,
  })

  revalidateBoards()
  return { ok: true }
}

export async function updateTask(taskId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { ok: false, error: '관리자만 항목을 수정할 수 있습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('tasks').update(toTaskUpdate(parsed.data)).eq('id', taskId)
  if (error) return { ok: false, error: '항목 수정에 실패했습니다.' }

  revalidateBoards(taskId)
  return { ok: true }
}

export async function addComment(input: { taskId: string; body: string }): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '로그인이 필요합니다.' }

  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('comments').insert({
    task_id: parsed.data.taskId,
    author_id: user.id,
    body: parsed.data.body,
  })
  if (error) return { ok: false, error: '코멘트 작성에 실패했습니다.' }

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
  if (!parsed.data.baseDate) return { ok: false, error: '기준 마감일을 선택해주세요.' }

  const supabase = createSupabaseServerClient()
  const { data: items } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', parsed.data.templateId)
  if (!items || items.length === 0) return { ok: false, error: '템플릿에 항목이 없습니다.' }

  const missingAssignee = items.some((item) => !item.default_assignee_id)
  if (missingAssignee) {
    return { ok: false, error: '담당자가 지정되지 않은 템플릿 항목이 있습니다. 템플릿을 확인해주세요.' }
  }

  const rows = items.map((item) => ({
    title: item.title,
    description: item.description,
    assignee_id: item.default_assignee_id!,
    environment: parsed.data.environment as 'dev' | 'stg' | 'prd',
    due_date: parsed.data.baseDate,
    is_blocking: item.is_blocking,
    confluence_url: item.confluence_url,
    verify_url: item.verify_url,
    verify_point: item.verify_point,
  }))

  const { data: created, error } = await supabase.from('tasks').insert(rows).select('id')
  if (error || !created) return { ok: false, error: '템플릿 생성에 실패했습니다.' }

  await supabase.from('task_history').insert(
    created.map((t) => ({
      task_id: t.id,
      from_status: null,
      to_status: 'todo' as TaskStatus,
      changed_by: user.id,
      reason: null,
    })),
  )

  revalidateBoards()
  return { ok: true }
}
