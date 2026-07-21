import type { Comment, Task, TaskHistory, Template, User } from '@/types'
import {
  users as mockUsers,
  tasks as mockTasks,
  taskHistories as mockHistories,
  comments as mockComments,
  templates as mockTemplates,
  templateItems as mockTemplateItems,
} from '@/lib/mock-data'

// TODO(supabase): 데이터 연동 단계에서 Supabase 조회로 교체한다.
// 페이지가 의존하는 함수 시그니처는 유지한다.

export async function getUsers(): Promise<User[]> {
  return mockUsers
}

export async function getAssignees(): Promise<User[]> {
  return mockUsers.filter((u) => u.role === 'assignee')
}

export async function getAllTasks(): Promise<Task[]> {
  return mockTasks
}

export async function getTasksForAssignee(userId: string): Promise<Task[]> {
  return mockTasks.filter((t) => t.assigneeId === userId)
}

export async function getTaskById(id: string): Promise<Task | null> {
  return mockTasks.find((t) => t.id === id) ?? null
}

export async function getAllHistories(): Promise<TaskHistory[]> {
  return mockHistories
}

export async function getHistoriesForTask(taskId: string): Promise<TaskHistory[]> {
  return mockHistories.filter((h) => h.taskId === taskId)
}

export async function getCommentsForTask(taskId: string): Promise<Comment[]> {
  return mockComments.filter((c) => c.taskId === taskId)
}

export async function getTemplates(): Promise<Template[]> {
  return mockTemplates
}

export async function getTemplateItems(templateId: string): Promise<string[]> {
  return mockTemplateItems[templateId] ?? []
}

export async function getLatestRejectionReasons(): Promise<Record<string, string | null>> {
  const latestByTask: Record<string, TaskHistory> = {}
  for (const h of mockHistories) {
    if (h.toStatus !== 'rejected') continue
    const prev = latestByTask[h.taskId]
    if (!prev || h.createdAt.localeCompare(prev.createdAt) > 0) {
      latestByTask[h.taskId] = h
    }
  }
  const reasons: Record<string, string | null> = {}
  for (const [taskId, h] of Object.entries(latestByTask)) {
    reasons[taskId] = h.reason
  }
  return reasons
}
