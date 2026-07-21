import type { Comment, SchedulePhase, Task, TaskHistory, Template, User } from '@/types'
import type { Database } from '@/lib/db/database.types'
import type { TaskInput } from '@/lib/validation'

type UserRow = Database['public']['Tables']['users']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type TaskHistoryRow = Database['public']['Tables']['task_history']['Row']
type CommentRow = Database['public']['Tables']['comments']['Row']
type TemplateRow = Database['public']['Tables']['templates']['Row']
type SchedulePhaseRow = Database['public']['Tables']['schedule_phases']['Row']

export function mapUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, role: row.role }
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigneeId: row.assignee_id,
    status: row.status,
    environment: row.environment,
    dueDate: row.due_date,
    isBlocking: row.is_blocking,
    confluenceUrl: row.confluence_url,
    verifyUrl: row.verify_url,
    verifyPoint: row.verify_point,
    screenshotUrl: row.screenshot_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// changed_by(uuid)는 화면 표기를 위해 사용자 이름으로 변환한다. (HANDOFF_REPORT 5-4 참조)
export function mapTaskHistory(row: TaskHistoryRow, resolveName: (userId: string) => string): TaskHistory {
  return {
    id: row.id,
    taskId: row.task_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: resolveName(row.changed_by),
    reason: row.reason,
    createdAt: row.created_at,
  }
}

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function mapTemplate(row: TemplateRow, itemCount: number): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    itemCount,
  }
}

export function mapSchedulePhase(row: SchedulePhaseRow): SchedulePhase {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    sortOrder: row.sort_order,
  }
}

export function toTaskInsert(input: TaskInput, assigneeId: string): Database['public']['Tables']['tasks']['Insert'] {
  return {
    title: input.title,
    description: input.description,
    assignee_id: assigneeId,
    environment: input.environment,
    due_date: input.dueDate,
    is_blocking: input.isBlocking,
    confluence_url: input.confluenceUrl,
    verify_url: input.verifyUrl,
    verify_point: input.verifyPoint,
  }
}

export function toTaskUpdate(input: TaskInput): Database['public']['Tables']['tasks']['Update'] {
  return {
    title: input.title,
    description: input.description,
    assignee_id: input.assigneeId,
    environment: input.environment,
    due_date: input.dueDate,
    is_blocking: input.isBlocking,
    confluence_url: input.confluenceUrl,
    verify_url: input.verifyUrl,
    verify_point: input.verifyPoint,
  }
}
