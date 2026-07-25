import type { TaskStatus, Environment, TeamRole } from '@/types'

// 화면에서 쓰는 상태는 할 일 / 완료 / 반려 3개다.
// in_progress·review_requested 는 과거 이력 표시를 위해 라벨만 남겨둔다(신규 항목에는 사용하지 않음).
export const STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  todo:             { label: '할 일',   cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  in_progress:      { label: '진행중',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  review_requested: { label: '완료요청', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:             { label: '완료',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:         { label: '반려',    cls: 'bg-red-50 text-red-700 border-red-200' },
}

export const ENV_CONFIG: Record<Environment, { label: string; cls: string }> = {
  dev: { label: 'DEV', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  stg: { label: 'STG', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  prd: { label: 'PRD', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'done', 'rejected']

// 담당자 직군 라벨 선택지. 기본값은 미정(null)이다.
export const TEAM_ROLES: TeamRole[] = ['사업', '기획', 'TPM', 'FE', 'BE']

// 브라우저에서 아직 아무도 "현재 사용자"를 선택하지 않았을 때 쓰는 플레이스홀더 멤버 id.
// 실제 팀원 중 아무나(알파벳/가나다순 첫 멤버)로 오인 귀속되는 걸 막기 위해 둔다.
// 마이그레이션 0012 가 이 id 로 '홍길동' 멤버 존재를 보장한다. 멤버 관리에서 지워도 무방하다(그 경우 선택을 요구한다).
export const DEFAULT_MEMBER_ID = '11111111-1111-1111-1111-111111111111'
