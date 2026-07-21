import type { Comment, SchedulePhase, Task, TaskHistory, Template, User } from '@/types'
import { createSupabaseDbClient } from '@/lib/supabase/server'
import { mapUser, mapTask, mapTaskHistory, mapComment, mapTemplate, mapSchedulePhase } from '@/lib/db/mappers'
import { readSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'

export async function getWebhookUrl(): Promise<string | null> {
  return readSetting(createSupabaseDbClient(), WEBHOOK_SETTING_KEY)
}

export async function getSchedulePhases(): Promise<SchedulePhase[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('schedule_phases').select('*').order('sort_order')
  return (data ?? []).map(mapSchedulePhase)
}

type NameResolver = (userId: string) => string

async function buildNameResolver(): Promise<NameResolver> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('users').select('id, name')
  const map = new Map((data ?? []).map((u) => [u.id, u.name]))
  return (userId: string) => map.get(userId) ?? '알 수 없음'
}

export async function getUsers(): Promise<User[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('users').select('*').order('name')
  return (data ?? []).map(mapUser)
}

export async function getAssignees(): Promise<User[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('users').select('*').eq('role', 'assignee').order('name')
  return (data ?? []).map(mapUser)
}

export async function getAllTasks(): Promise<Task[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('tasks').select('*').order('created_at')
  return (data ?? []).map(mapTask)
}

export async function getTasksForAssignee(userId: string): Promise<Task[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('tasks').select('*').eq('assignee_id', userId).order('created_at')
  return (data ?? []).map(mapTask)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle()
  return data ? mapTask(data) : null
}

export async function getHistoriesForTask(taskId: string): Promise<TaskHistory[]> {
  const supabase = createSupabaseDbClient()
  const [{ data }, resolveName] = await Promise.all([
    supabase.from('task_history').select('*').eq('task_id', taskId).order('created_at'),
    buildNameResolver(),
  ])
  return (data ?? []).map((row) => mapTaskHistory(row, resolveName))
}

export async function getCommentsForTask(taskId: string): Promise<Comment[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase.from('comments').select('*').eq('task_id', taskId).order('created_at')
  return (data ?? []).map(mapComment)
}

export async function getTemplates(): Promise<Template[]> {
  const supabase = createSupabaseDbClient()
  const [{ data: templates }, { data: items }] = await Promise.all([
    supabase.from('templates').select('*').order('created_at'),
    supabase.from('template_items').select('template_id'),
  ])
  const countByTemplate = new Map<string, number>()
  for (const item of items ?? []) {
    countByTemplate.set(item.template_id, (countByTemplate.get(item.template_id) ?? 0) + 1)
  }
  return (templates ?? []).map((t) => mapTemplate(t, countByTemplate.get(t.id) ?? 0))
}

export async function getTemplateItems(templateId: string): Promise<string[]> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase
    .from('template_items')
    .select('title')
    .eq('template_id', templateId)
    .order('title')
  return (data ?? []).map((row) => row.title)
}

export async function getLatestRejectionReasons(): Promise<Record<string, string | null>> {
  const supabase = createSupabaseDbClient()
  const { data } = await supabase
    .from('task_history')
    .select('task_id, reason, created_at')
    .eq('to_status', 'rejected')
    .order('created_at', { ascending: true })

  const reasons: Record<string, string | null> = {}
  for (const row of data ?? []) {
    // created_at 오름차순이므로 마지막으로 덮어써진 값이 가장 최근 반려 사유가 된다.
    reasons[row.task_id] = row.reason
  }
  return reasons
}
