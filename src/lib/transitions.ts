import type { TaskStatus, UserRole } from '@/types'

// todo -> in_progress -> review_requested -> done
//                              |
//                              +-> rejected -> in_progress
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress'],
  in_progress: ['review_requested'],
  review_requested: ['done', 'rejected'],
  done: [],
  rejected: ['in_progress'],
}

// done / rejected 전환은 관리자만 가능하다.
const ADMIN_ONLY_TARGETS: TaskStatus[] = ['done', 'rejected']

// rejected 전환 시 사유 입력이 필수다.
export const REASON_REQUIRED_TARGET: TaskStatus = 'rejected'

export type TransitionCheck = { ok: true } | { ok: false; reason: string }

export function validateTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: UserRole,
  reason: string | null,
): TransitionCheck {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `'${from}' 상태에서 '${to}' 상태로 변경할 수 없습니다.` }
  }
  if (ADMIN_ONLY_TARGETS.includes(to) && role !== 'admin') {
    return { ok: false, reason: '해당 상태 변경은 관리자만 수행할 수 있습니다.' }
  }
  if (to === REASON_REQUIRED_TARGET && !reason?.trim()) {
    return { ok: false, reason: '반려 사유를 입력해주세요.' }
  }
  return { ok: true }
}

export function allowedNextStatuses(from: TaskStatus, role: UserRole): TaskStatus[] {
  return ALLOWED_TRANSITIONS[from].filter(
    (to) => !ADMIN_ONLY_TARGETS.includes(to) || role === 'admin',
  )
}
