import type { TaskStatus } from '@/types'

// 상태는 3개(할 일/완료/반려)뿐이며, 로그인·역할 구분이 없으므로 어떤 담당자든 전환할 수 있다.
// 노션식 칸반처럼 어느 컬럼으로든 자유롭게 옮길 수 있게, 자기 자신을 뺀 나머지 상태로의 이동을 모두 허용한다.
// (반려로 옮길 때만 사유가 필수다)
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['done', 'rejected'],
  done: ['todo', 'rejected'],
  rejected: ['todo', 'done'],
  in_progress: ['todo', 'done', 'rejected'],
  review_requested: ['todo', 'done', 'rejected'],
}

// 반려 전환 시 사유 입력이 필수다.
export const REASON_REQUIRED_TARGET: TaskStatus = 'rejected'

export type TransitionCheck = { ok: true } | { ok: false; reason: string }

export function validateTransition(
  from: TaskStatus,
  to: TaskStatus,
  reason: string | null,
): TransitionCheck {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `'${from}' 상태에서 '${to}' 상태로 변경할 수 없습니다.` }
  }
  if (to === REASON_REQUIRED_TARGET && !reason?.trim()) {
    return { ok: false, reason: '반려 사유를 입력해주세요.' }
  }
  return { ok: true }
}

export function allowedNextStatuses(from: TaskStatus): TaskStatus[] {
  return ALLOWED_TRANSITIONS[from]
}
