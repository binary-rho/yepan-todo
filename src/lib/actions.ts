'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseDbClient } from '@/lib/supabase/server'
import { validateTransition } from '@/lib/transitions'
import { toTaskInsert, toTaskUpdate } from '@/lib/db/mappers'
import { writeSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'
import { notifyTaskAssigned, notifyRejected } from '@/lib/notifications'
import {
  taskInputSchema,
  statusChangeSchema,
  commentSchema,
  templateUseSchema,
  webhookUrlSchema,
  schedulePhasesSchema,
  profileSchema,
} from '@/lib/validation'
import { PROFILE_USER_ID } from '@/lib/profile'
import type { TaskStatus } from '@/types'

type ServerClient = ReturnType<typeof createSupabaseDbClient>

async function resolveUserName(supabase: ServerClient, userId: string): Promise<string> {
  const { data } = await supabase.from('users').select('name').eq('id', userId).single()
  return data?.name ?? '담당자'
}

export type ActionResult = { ok: true } | { ok: false; error: string }

function revalidateBoards(taskId?: string): void {
  revalidatePath('/')
  if (taskId) revalidatePath(`/tasks/${taskId}`)
}

export async function changeTaskStatus(input: {
  taskId: string
  toStatus: string
  reason?: string | null
}): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = statusChangeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, status, assignee_id')
    .eq('id', parsed.data.taskId)
    .maybeSingle()
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  const reason = parsed.data.reason?.trim() || null
  const toStatus = parsed.data.toStatus as TaskStatus
  const check = validateTransition(task.status, toStatus, reason)
  if (!check.ok) return { ok: false, error: check.reason }

  const { error: historyError } = await supabase.from('task_history').insert({
    task_id: task.id,
    from_status: task.status,
    to_status: toStatus,
    changed_by: user.id,
    reason,
  })
  if (historyError) return { ok: false, error: '상태 변경 이력 기록에 실패했습니다.' }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: toStatus })
    .eq('id', task.id)
  if (updateError) return { ok: false, error: '상태 변경에 실패했습니다.' }

  if (toStatus === 'rejected') {
    const assigneeName = await resolveUserName(supabase, task.assignee_id)
    await notifyRejected({ taskId: task.id, title: task.title, assigneeName, reason: reason ?? '' })
  }

  revalidateBoards(task.id)
  return { ok: true }
}

export async function createTask(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
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

  const assigneeName = await resolveUserName(supabase, parsed.data.assigneeId)
  await notifyTaskAssigned({ taskId: created.id, title: parsed.data.title, assigneeName })

  revalidateBoards()
  return { ok: true }
}

export async function updateTask(taskId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error } = await supabase.from('tasks').update(toTaskUpdate(parsed.data)).eq('id', taskId)
  if (error) return { ok: false, error: '항목 수정에 실패했습니다.' }

  revalidateBoards(taskId)
  return { ok: true }
}

export async function addComment(input: { taskId: string; body: string }): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
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
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = templateUseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  if (!parsed.data.baseDate) return { ok: false, error: '기준 마감일을 선택해주세요.' }

  const supabase = createSupabaseDbClient()
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

// 운영자 프로필(이름/이메일) 수정. 로그인이 없으므로 이 값이 곧 "현재 사용자"다.
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error } = await supabase
    .from('users')
    .update({ name: parsed.data.name, email: parsed.data.email })
    .eq('id', PROFILE_USER_ID)
  if (error) return { ok: false, error: '프로필 저장에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true }
}

// 알림 웹훅 URL 은 화면에서 입력한다. 빈 문자열이면 값을 비워(=알림 미발송) 저장한다.
export async function updateWebhookUrl(url: string): Promise<ActionResult> {
  const trimmed = url.trim()
  if (trimmed) {
    const parsed = webhookUrlSchema.safeParse(trimmed)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  }

  const supabase = createSupabaseDbClient()
  const { ok } = await writeSetting(supabase, WEBHOOK_SETTING_KEY, trimmed || null)
  if (!ok) return { ok: false, error: '웹훅 URL 저장에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true }
}

// 일정(국면 목록)은 전체 교체 방식으로 저장한다. (국면 수가 적고 순서 관리가 단순함)
export async function saveSchedulePhases(input: unknown): Promise<ActionResult> {
  const parsed = schedulePhasesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error: deleteError } = await supabase
    .from('schedule_phases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) return { ok: false, error: '일정 저장에 실패했습니다.' }

  if (parsed.data.length > 0) {
    const rows = parsed.data.map((phase, index) => ({
      name: phase.name,
      start_date: phase.startDate,
      end_date: phase.endDate,
      sort_order: index,
    }))
    const { error: insertError } = await supabase.from('schedule_phases').insert(rows)
    if (insertError) return { ok: false, error: '일정 저장에 실패했습니다.' }
  }

  revalidatePath('/')
  return { ok: true }
}
