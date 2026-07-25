import type { SchedulePhase } from '@/types'
import { addDays, formatDate } from '@/lib/date'

// 템플릿 항목의 마감일은 세 가지 방식 중 하나로 정한다.
// - phase: 등록한 일정(예: 사전예약)의 시작일 기준 ± N일 → 회차마다 일정이 바뀌어도 알아서 따라간다.
// - fixed: 회차와 무관하게 못박은 날짜.
// - base : 템플릿 적용 화면에서 입력한 기준 마감일을 그대로 사용(기본값).
export type TemplateDueMode = 'base' | 'phase' | 'fixed'

// 오프셋은 앞/뒤 1년을 넘길 이유가 없다. 오타로 엉뚱한 날짜가 계산되는 것도 막는다.
export const DUE_OFFSET_LIMIT_DAYS = 365

export interface TemplateDueRule {
  duePhaseName: string | null
  dueOffsetDays: number
  dueDate: string | null
}

export function dueModeOf(rule: TemplateDueRule): TemplateDueMode {
  if (rule.duePhaseName) return 'phase'
  if (rule.dueDate) return 'fixed'
  return 'base'
}

// 일정은 회차마다 다시 등록되면서 id 가 새로 발급되므로 이름으로 찾는다.
function findPhase(phases: SchedulePhase[], name: string): SchedulePhase | null {
  const target = name.trim().toLowerCase()
  return phases.find(phase => phase.name.trim().toLowerCase() === target) ?? null
}

// 실제로 항목에 들어갈 마감일. 규칙이 가리키는 일정이 지금 등록돼 있지 않으면 기준 마감일로 대체한다.
export function resolveTemplateDueDate(
  rule: TemplateDueRule,
  phases: SchedulePhase[],
  baseDate: string | null,
): string | null {
  if (rule.duePhaseName) {
    const phase = findPhase(phases, rule.duePhaseName)
    return phase ? addDays(phase.startDate, rule.dueOffsetDays) : baseDate
  }
  if (rule.dueDate) return rule.dueDate
  return baseDate
}

// "3일 전" / "당일" / "2일 후"
export function formatOffsetDays(days: number): string {
  if (days === 0) return '당일'
  return days < 0 ? `${Math.abs(days)}일 전` : `${days}일 후`
}

// 목록에서 규칙 자체를 사람이 읽을 수 있게 보여준다.
// 참조하는 일정이 사라진 경우도 그대로 드러내야 사용자가 원인을 알 수 있다.
export function describeTemplateDueRule(rule: TemplateDueRule, phases: SchedulePhase[]): string {
  if (rule.duePhaseName) {
    const phase = findPhase(phases, rule.duePhaseName)
    const offset = formatOffsetDays(rule.dueOffsetDays)
    if (!phase) return `${rule.duePhaseName} ${offset} (현재 일정에 없음 → 기준일)`
    return `${phase.name} ${offset} (${formatDate(addDays(phase.startDate, rule.dueOffsetDays))})`
  }
  if (rule.dueDate) return formatDate(rule.dueDate)
  return '적용 시 기준일'
}
