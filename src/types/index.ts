export type TaskStatus = 'todo' | 'in_progress' | 'review_requested' | 'done' | 'rejected'
export type Environment = 'dev' | 'stg' | 'prd'
// 담당자 직군 라벨. 미정(null)이 기본값이다.
export type TeamRole = '사업' | '기획' | 'TPM' | 'FE' | 'BE'

// 로그인/권한 등급이 없다. 모든 담당자는 동등하며, 화면에서 "현재 사용자"로
// 선택한 사람이 곧 작업자(changed_by/author_id)가 된다.
export interface User {
  id: string
  email: string
  name: string
  teamRole: TeamRole | null
}

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  createdAt: string
  archivedAt: string | null
}

export interface ProjectNote {
  id: string
  projectId: string
  body: string
  authorId: string | null
  authorName: string
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  assigneeId: string
  status: TaskStatus
  environment: Environment
  dueDate: string | null
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

export interface TemplateItem {
  id: string
  templateId: string
  title: string
  description: string | null
  environment: Environment | null
  confluenceUrl: string | null
  verifyUrl: string | null
  verifyPoint: string | null
  defaultAssigneeId: string | null
}

export interface SchedulePhase {
  id: string
  name: string
  startDate: string
  endDate: string | null
  sortOrder: number
}
