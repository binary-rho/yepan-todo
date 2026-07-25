'use client'

import type { SchedulePhase } from '@/types'
import type { TemplateDueMode, TemplateDueRule } from '@/lib/templateDueDate'
import { DUE_OFFSET_LIMIT_DAYS, describeTemplateDueRule, dueModeOf } from '@/lib/templateDueDate'

// 화면에서는 "-3일" 처럼 부호로 입력받으면 헷갈리므로 며칠 / 전·후 를 따로 받고,
// 저장할 때 하나의 부호 있는 일수(dueOffsetDays)로 합친다.
type OffsetDirection = 'before' | 'after'

export interface DueRuleDraft {
  mode: TemplateDueMode
  phaseName: string
  offsetAmount: string
  offsetDirection: OffsetDirection
  fixedDate: string
}

const MODE_LABEL: Record<TemplateDueMode, string> = {
  base: '적용 시 기준일',
  phase: '일정 기준',
  fixed: '날짜 직접 선택',
}

export function emptyDueRuleDraft(): DueRuleDraft {
  return { mode: 'base', phaseName: '', offsetAmount: '0', offsetDirection: 'after', fixedDate: '' }
}

export function toDueRuleDraft(rule: TemplateDueRule): DueRuleDraft {
  return {
    mode: dueModeOf(rule),
    phaseName: rule.duePhaseName ?? '',
    offsetAmount: String(Math.abs(rule.dueOffsetDays)),
    offsetDirection: rule.dueOffsetDays < 0 ? 'before' : 'after',
    fixedDate: rule.dueDate ?? '',
  }
}

export function fromDueRuleDraft(draft: DueRuleDraft): TemplateDueRule {
  if (draft.mode === 'phase' && draft.phaseName) {
    const amount = Math.min(Math.abs(Number.parseInt(draft.offsetAmount, 10) || 0), DUE_OFFSET_LIMIT_DAYS)
    return {
      duePhaseName: draft.phaseName,
      dueOffsetDays: draft.offsetDirection === 'before' ? -amount : amount,
      dueDate: null,
    }
  }
  if (draft.mode === 'fixed' && draft.fixedDate) {
    return { duePhaseName: null, dueOffsetDays: 0, dueDate: draft.fixedDate }
  }
  return { duePhaseName: null, dueOffsetDays: 0, dueDate: null }
}

interface TemplateDueRuleFieldProps {
  phases: SchedulePhase[]
  value: DueRuleDraft
  onChange: (next: DueRuleDraft) => void
}

// 템플릿은 여러 회차에 재사용되므로 날짜를 못박기보다 "등록한 일정 기준 며칠 전/후" 로 두는 편이 낫다.
// 그래도 회차와 무관하게 고정해야 하는 항목이 있어 직접 날짜 선택도 함께 제공한다.
export function TemplateDueRuleField({ phases, value, onChange }: TemplateDueRuleFieldProps) {
  const hasPhases = phases.length > 0

  function changeMode(mode: TemplateDueMode) {
    // 일정 기준으로 바꾸면 곧바로 고를 수 있게 첫 일정을 기본값으로 채운다.
    const phaseName = mode === 'phase' && !value.phaseName ? phases[0]?.name ?? '' : value.phaseName
    onChange({ ...value, mode, phaseName })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-zinc-500 tracking-tight shrink-0">마감일</span>
        <select
          className="px-2 py-1 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400 bg-white"
          value={value.mode}
          onChange={e => changeMode(e.target.value as TemplateDueMode)}
        >
          <option value="base">{MODE_LABEL.base}</option>
          <option value="phase" disabled={!hasPhases}>
            {MODE_LABEL.phase}
            {hasPhases ? '' : ' (등록된 일정 없음)'}
          </option>
          <option value="fixed">{MODE_LABEL.fixed}</option>
        </select>

        {value.mode === 'phase' && (
          <>
            <select
              className="px-2 py-1 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400 bg-white max-w-[160px]"
              value={value.phaseName}
              onChange={e => onChange({ ...value, phaseName: e.target.value })}
            >
              {phases.map(phase => (
                <option key={phase.id} value={phase.name}>{phase.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={DUE_OFFSET_LIMIT_DAYS}
              className="w-16 px-2 py-1 border border-zinc-200 rounded text-[12px] tabular-nums tracking-tight outline-none focus:border-zinc-400"
              value={value.offsetAmount}
              onChange={e => onChange({ ...value, offsetAmount: e.target.value })}
            />
            <span className="text-[12px] text-zinc-500 tracking-tight">일</span>
            <select
              className="px-2 py-1 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400 bg-white"
              value={value.offsetDirection}
              onChange={e => onChange({ ...value, offsetDirection: e.target.value as OffsetDirection })}
            >
              <option value="before">전</option>
              <option value="after">후</option>
            </select>
          </>
        )}

        {value.mode === 'fixed' && (
          <input
            type="date"
            className="px-2 py-1 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400"
            value={value.fixedDate}
            onChange={e => onChange({ ...value, fixedDate: e.target.value })}
          />
        )}
      </div>

      <DueRulePreview phases={phases} draft={value} />
    </div>
  )
}

function DueRulePreview({ phases, draft }: { phases: SchedulePhase[]; draft: DueRuleDraft }) {
  if (draft.mode === 'base') {
    return (
      <p className="text-[11px] text-zinc-400 tracking-tight">
        템플릿을 적용할 때 입력하는 기준 마감일이 그대로 들어갑니다.
      </p>
    )
  }
  return (
    <p className="text-[11px] text-zinc-400 tracking-tight">
      현재 일정 기준: {describeTemplateDueRule(fromDueRuleDraft(draft), phases)}
      {draft.mode === 'phase' && ' — 일정 시작일 기준으로 계산됩니다.'}
    </p>
  )
}
