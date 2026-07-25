'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseDbClient } from '@/lib/supabase/server'
import { validateTransition } from '@/lib/transitions'
import { toTaskInsert, toTaskUpdate } from '@/lib/db/mappers'
import { writeSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'
import { notifyTaskAssigned, notifyRejected, sendManualCall } from '@/lib/notifications'
import {
  taskInputSchema,
  statusChangeSchema,
  commentSchema,
  templateUseSchema,
  templateInputSchema,
  webhookUrlSchema,
  schedulePhasesSchema,
  profileSchema,
  memberInputSchema,
  memberImportListSchema,
  projectNameSchema,
  projectNoteSchema,
} from '@/lib/validation'
import type { TemplateInput } from '@/lib/validation'
import { PROFILE_USER_ID } from '@/lib/profile'
import type { TaskStatus } from '@/types'

type ServerClient = ReturnType<typeof createSupabaseDbClient>

async function resolveUserName(supabase: ServerClient, userId: string): Promise<string> {
  const { data } = await supabase.from('users').select('name').eq('id', userId).single()
  return data?.name ?? '담당자'
}

// 보관된 회차에서는 항목 생성/상태변경/메모를 막는다. 문제 없으면 null 을 반환한다.
async function projectWriteError(supabase: ServerClient, projectId: string): Promise<string | null> {
  const { data } = await supabase.from('projects').select('status').eq('id', projectId).maybeSingle()
  if (!data) return '대시보드를 찾을 수 없습니다.'
  if (data.status === 'archived') return '보관된 대시보드에서는 변경할 수 없습니다.'
  return null
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
    .select('id, title, status, assignee_id, project_id')
    .eq('id', parsed.data.taskId)
    .maybeSingle()
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  const writeError = await projectWriteError(supabase, task.project_id)
  if (writeError) return { ok: false, error: writeError }

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

// 대시보드에서 담당자를 바로 변경한다. (상세 진입 없이)
export async function changeTaskAssignee(taskId: string, assigneeId: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }
  if (!assigneeId) return { ok: false, error: '담당자를 선택해주세요.' }

  const supabase = createSupabaseDbClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .maybeSingle()
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  const writeError = await projectWriteError(supabase, task.project_id)
  if (writeError) return { ok: false, error: writeError }

  const { data: assignee } = await supabase.from('users').select('id').eq('id', assigneeId).maybeSingle()
  if (!assignee) return { ok: false, error: '존재하지 않는 담당자입니다.' }

  const { error } = await supabase.from('tasks').update({ assignee_id: assigneeId }).eq('id', taskId)
  if (error) return { ok: false, error: '담당자 변경에 실패했습니다.' }

  revalidateBoards(taskId)
  return { ok: true }
}

// 항목 담당자에게 즉시 알림(호출)을 보낸다. Teams 웹훅이면 담당자를 @태그한다.
export async function notifyTaskNow(taskId: string): Promise<ActionResult> {
  const supabase = createSupabaseDbClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, assignee_id')
    .eq('id', taskId)
    .maybeSingle()
  if (!task) return { ok: false, error: '항목을 찾을 수 없습니다.' }

  const { data: assignee } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', task.assignee_id)
    .maybeSingle()
  if (!assignee) return { ok: false, error: '담당자 정보를 찾을 수 없습니다.' }

  const mention = assignee.email ? { id: assignee.email, name: assignee.name } : undefined
  const result = await sendManualCall({ taskId: task.id, title: task.title, assigneeName: assignee.name, mention })
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === 'no_webhook'
          ? '알림 웹훅이 설정되지 않았습니다. 보드 상단에서 URL을 입력해주세요.'
          : '알림 발송에 실패했습니다.',
    }
  }
  return { ok: true }
}

export async function createTask(projectId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = taskInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const writeError = await projectWriteError(supabase, projectId)
  if (writeError) return { ok: false, error: writeError }

  const { data: created, error } = await supabase
    .from('tasks')
    .insert(toTaskInsert(parsed.data, parsed.data.assigneeId, projectId))
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

export async function createTasksFromTemplate(projectId: string, input: {
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
  const writeError = await projectWriteError(supabase, projectId)
  if (writeError) return { ok: false, error: writeError }

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
    project_id: projectId,
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

// 담당자(멤버) 추가. 이메일은 Teams @멘션 id(UPN)로도 쓰이므로 실제 조직 이메일을 넣는다.
export async function createMember(input: unknown): Promise<ActionResult> {
  const parsed = memberInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error } = await supabase.from('users').insert({
    id: crypto.randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    role: 'assignee',
    team_role: parsed.data.teamRole ?? null,
  })
  if (error) return { ok: false, error: '멤버 추가에 실패했습니다.' }

  revalidatePath('/')
  revalidatePath('/templates')
  return { ok: true }
}

export async function updateMember(memberId: string, input: unknown): Promise<ActionResult> {
  const parsed = memberInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error } = await supabase
    .from('users')
    .update({ name: parsed.data.name, email: parsed.data.email, team_role: parsed.data.teamRole ?? null })
    .eq('id', memberId)
  if (error) return { ok: false, error: '멤버 수정에 실패했습니다.' }

  revalidatePath('/')
  revalidatePath('/templates')
  return { ok: true }
}

// 팀즈에서 가져온 멤버를 일괄 등록한다. 역할은 미정(null)으로 시작하며 이후 각자 수정한다.
// 이메일이 이미 등록돼 있으면 조용히 건너뛴다(unique 제약 위반 방지).
export async function createMembersBulk(input: unknown): Promise<ActionResult> {
  const parsed = memberImportListSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const rows = parsed.data.map((m) => ({
    id: crypto.randomUUID(),
    name: m.name,
    email: m.email,
    role: 'assignee' as const,
    team_role: null,
  }))
  const { error } = await supabase.from('users').upsert(rows, { onConflict: 'email', ignoreDuplicates: true })
  if (error) return { ok: false, error: '멤버 일괄 추가에 실패했습니다.' }

  revalidatePath('/')
  revalidatePath('/templates')
  return { ok: true }
}

interface GraphTokenResponse {
  access_token?: string
}
interface GraphMember {
  displayName?: string
  email?: string
}
interface GraphMembersResponse {
  value?: GraphMember[]
}

export type ImportMembersResult =
  | { ok: true; members: { name: string; email: string }[] }
  | { ok: false; error: string }

// Microsoft Graph 로 팀즈 채널(팀) 멤버를 조회한다. 연동 정보가 없거나 실패하면 그냥 실패를 돌려준다.
// 필요한 환경변수: MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_TEAM_ID
export async function importTeamsMembers(): Promise<ImportMembersResult> {
  const tenantId = process.env.MS_GRAPH_TENANT_ID
  const clientId = process.env.MS_GRAPH_CLIENT_ID
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET
  const teamId = process.env.MS_GRAPH_TEAM_ID
  if (!tenantId || !clientId || !clientSecret || !teamId) {
    return {
      ok: false,
      error: 'Microsoft Graph 연동 정보가 설정되지 않았습니다. (MS_GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET/TEAM_ID)',
    }
  }

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    })
    if (!tokenRes.ok) return { ok: false, error: 'Microsoft 인증에 실패했습니다.' }
    const tokenJson = (await tokenRes.json()) as GraphTokenResponse
    if (!tokenJson.access_token) return { ok: false, error: 'Microsoft 인증에 실패했습니다.' }

    const membersRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    if (!membersRes.ok) {
      return { ok: false, error: '팀 멤버 조회에 실패했습니다. 앱 권한/관리자 동의를 확인해주세요.' }
    }
    const membersJson = (await membersRes.json()) as GraphMembersResponse
    const members = (membersJson.value ?? [])
      .filter((m): m is Required<Pick<GraphMember, 'email'>> & GraphMember => Boolean(m.email))
      .map((m) => ({ name: m.displayName ?? m.email, email: m.email }))

    if (members.length === 0) return { ok: false, error: '가져올 멤버가 없습니다.' }
    return { ok: true, members }
  } catch (e) {
    console.error('[graph] 팀즈 멤버 조회 실패', e)
    return { ok: false, error: '팀즈 멤버를 가져오는 중 오류가 발생했습니다.' }
  }
}

// 운영자 프로필은 삭제 불가. 항목/이력에 연결된 멤버도 FK 로 삭제가 막힌다.
export async function deleteMember(memberId: string): Promise<ActionResult> {
  if (memberId === PROFILE_USER_ID) return { ok: false, error: '운영자 프로필은 삭제할 수 없습니다.' }

  const supabase = createSupabaseDbClient()
  const { error } = await supabase.from('users').delete().eq('id', memberId)
  if (error) return { ok: false, error: '연결된 항목이나 이력이 있어 삭제할 수 없습니다.' }

  revalidatePath('/')
  revalidatePath('/templates')
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

// 템플릿 항목(입력) → template_items insert row 변환.
function toTemplateItemRows(templateId: string, items: TemplateInput['items']) {
  return items.map((item) => ({
    template_id: templateId,
    title: item.title,
    description: item.description,
    environment: item.environment,
    is_blocking: item.isBlocking,
    confluence_url: item.confluenceUrl,
    verify_url: item.verifyUrl,
    verify_point: item.verifyPoint,
    default_assignee_id: item.defaultAssigneeId,
  }))
}

export async function createTemplate(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = templateInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { data: created, error } = await supabase
    .from('templates')
    .insert({ name: parsed.data.name, description: parsed.data.description })
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: '템플릿 생성에 실패했습니다.' }

  const { error: itemsError } = await supabase
    .from('template_items')
    .insert(toTemplateItemRows(created.id, parsed.data.items))
  if (itemsError) return { ok: false, error: '템플릿 항목 저장에 실패했습니다.' }

  revalidatePath('/templates')
  return { ok: true }
}

// 템플릿 항목은 전체 교체 방식으로 저장한다. (항목 수가 적고 순서/구성 관리가 단순함)
export async function updateTemplate(templateId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = templateInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const { error: updateError } = await supabase
    .from('templates')
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq('id', templateId)
  if (updateError) return { ok: false, error: '템플릿 수정에 실패했습니다.' }

  const { error: deleteError } = await supabase.from('template_items').delete().eq('template_id', templateId)
  if (deleteError) return { ok: false, error: '템플릿 항목 저장에 실패했습니다.' }

  const { error: itemsError } = await supabase
    .from('template_items')
    .insert(toTemplateItemRows(templateId, parsed.data.items))
  if (itemsError) return { ok: false, error: '템플릿 항목 저장에 실패했습니다.' }

  revalidatePath('/templates')
  return { ok: true }
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  const supabase = createSupabaseDbClient()
  const { error } = await supabase.from('templates').delete().eq('id', templateId)
  if (error) return { ok: false, error: '템플릿 삭제에 실패했습니다.' }

  revalidatePath('/templates')
  return { ok: true }
}

// 새 대시보드(회차)를 만든다. archiveCurrentId 가 있으면 그 회차를 보관 처리한 뒤 새 회차를 연다.
// 성공 시 새 회차 id 를 함께 돌려줘 클라이언트가 그 대시보드로 이동한다.
export async function startNewDashboard(input: {
  name: string
  archiveCurrentId?: string | null
}): Promise<ActionResult & { projectId?: string }> {
  const parsed = projectNameSchema.safeParse(input.name)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()

  if (input.archiveCurrentId) {
    const { error: archiveError } = await supabase
      .from('projects')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', input.archiveCurrentId)
    if (archiveError) return { ok: false, error: '기존 대시보드 보관에 실패했습니다.' }
  }

  const { data: created, error } = await supabase
    .from('projects')
    .insert({ name: parsed.data, status: 'active' })
    .select('id')
    .single()
  if (error || !created) return { ok: false, error: '대시보드 생성에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, projectId: created.id }
}

// 대시보드 보관/재개 토글.
export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionResult> {
  const supabase = createSupabaseDbClient()
  const { error } = await supabase
    .from('projects')
    .update({
      status: archived ? 'archived' : 'active',
      archived_at: archived ? new Date().toISOString() : null,
    })
    .eq('id', projectId)
  if (error) return { ok: false, error: '대시보드 상태 변경에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true }
}

export async function addProjectNote(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '프로필 정보를 확인할 수 없습니다.' }

  const parsed = projectNoteSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseDbClient()
  const writeError = await projectWriteError(supabase, parsed.data.projectId)
  if (writeError) return { ok: false, error: writeError }

  const { error } = await supabase.from('project_notes').insert({
    project_id: parsed.data.projectId,
    body: parsed.data.body,
    author_id: user.id,
  })
  if (error) return { ok: false, error: '메모 저장에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true }
}

export async function deleteProjectNote(noteId: string): Promise<ActionResult> {
  const supabase = createSupabaseDbClient()
  const { error } = await supabase.from('project_notes').delete().eq('id', noteId)
  if (error) return { ok: false, error: '메모 삭제에 실패했습니다.' }

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
