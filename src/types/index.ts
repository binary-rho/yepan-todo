export type TaskStatus = 'todo' | 'in_progress' | 'review_requested' | 'done' | 'rejected'
export type Environment = 'dev' | 'stg' | 'prd'
// 담당자 직군 라벨. 미정(null)이 기본값이다.
export type TeamRole = '사업' | '기획' | 'TPM' | 'FE' | 'BE'

// 로그인/권한 등급이 없다. 모든 담당자는 동등하며, 화면에서 "현재 사용자"로
// 선택한 사람이 곧 작업자(changed_by/author_id)가 된다.
// 멤버는 회차(프로젝트)마다 팀 구성이 다를 수 있어 프로젝트 하나에만 속한다(전역 공유 아님).
export interface User {
  id: string
  projectId: string
  email: string
  name: string
  teamRole: TeamRole | null
}

export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  description: string | null
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
  // 템플릿은 여러 회차에 걸쳐 재사용되고 멤버는 회차마다 다르므로, 실제 배정이 아니라
  // "이런 역할/사람이 담당했었다" 정도의 자유 텍스트 힌트다. 실제 담당자는 적용 시점에 고른다.
  defaultAssigneeName: string | null
}

export interface SchedulePhase {
  id: string
  name: string
  startDate: string
  endDate: string | null
  sortOrder: number
}
