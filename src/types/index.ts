export type TaskStatus = 'todo' | 'in_progress' | 'review_requested' | 'done' | 'rejected'
export type Environment = 'dev' | 'stg' | 'prd'
export type UserRole = 'admin' | 'assignee'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface Task {
  id: string
  title: string
  description: string | null
  assigneeId: string
  status: TaskStatus
  environment: Environment
  dueDate: string | null
  isBlocking: boolean
  confluenceUrl: string | null
  verifyUrl: string | null
  verifyPoint: string | null
  screenshotUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskHistory {
  id: string
  taskId: string
  fromStatus: TaskStatus | null
  toStatus: TaskStatus
  changedBy: string
  reason: string | null
  createdAt: string
}

export interface Comment {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
}

export interface Template {
  id: string
  name: string
  description: string | null
  itemCount: number
}
