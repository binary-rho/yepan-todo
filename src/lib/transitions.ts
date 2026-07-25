import type { TaskStatus } from '@/types'

// 상태는 3개(할 일/완료/반려)뿐이며, 로그인·역할이 없으므로 누구나(=단일 운영자) 전환할 수 있다.
//   할 일  ─ 완료 / 반려
//   완료   ─ 할 일(되돌리기)
//   반려   ─ 할 일(다시 진행)
// in_progress·review_requested 는 과거 이력에만 존재하므로 안전하게 '할 일'로 되돌릴 수 있게 둔다.
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['done', 'rejected'],
  done: ['todo'],
  rejected: ['todo'],
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
