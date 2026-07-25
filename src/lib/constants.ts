import type { TaskStatus, Environment, TeamRole } from '@/types'

// 화면에서 쓰는 상태는 할 일 / 완료 / 재설정 필요 3개다.
// in_progress·review_requested 는 과거 이력 표시를 위해 라벨만 남겨둔다(신규 항목에는 사용하지 않음).
// DB enum 값은 계속 'rejected' 다. 화면 문구만 "세팅을 다시 해야 한다"는 뜻으로 바꿨다(결정 41).
export const STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  todo:             { label: '할 일',   cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  in_progress:      { label: '진행중',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  review_requested: { label: '완료요청', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  done:             { label: '완료',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected:         { label: '재설정 필요', cls: 'bg-red-50 text-red-700 border-red-200' },
}

// 실사용 환경은 STG / PROD 두 개뿐이다(DEV 는 쓰지 않는다).
export const ENV_CONFIG: Record<Environment, { label: string; cls: string }> = {
  stg: { label: 'STG', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  prod: { label: 'PROD', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

// 환경 선택 UI 들이 공통으로 쓰는 순서. 환경이 늘거나 줄면 ENV_CONFIG 와 이 배열만 고치면 된다.
export const ENVIRONMENTS: Environment[] = ['stg', 'prod']

export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'done', 'rejected']

// 담당자 직군 라벨 선택지. 기본값은 미정(null)이다.
export const TEAM_ROLES: TeamRole[] = ['사업', '기획', 'TPM', 'FE', 'BE']
