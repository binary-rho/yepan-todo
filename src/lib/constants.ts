import type { TaskStatus, Environment } from '@/types'

export const STATUS_CONFIG: Record<TaskStatus, { label: string; cls: string }> = {
  todo:             { label: '대기',    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
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

export const KANBAN_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review_requested', 'done', 'rejected']
