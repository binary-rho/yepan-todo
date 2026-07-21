import type { User } from '@/types'
import { getDday, isOverdue, isDueSoon, formatDate, initials } from '@/lib/date'

export function DueDateDisplay({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-zinc-400 text-[13px] tabular-nums">—</span>
  const dday = getDday(dueDate)
  const over = isOverdue(dueDate)
  const soon = isDueSoon(dueDate)
  return (
    <span className={`text-[13px] tabular-nums tracking-tight ${over ? 'text-red-600 font-medium' : soon ? 'text-amber-600' : 'text-zinc-500'}`}>
      {formatDate(dueDate)}
      {dday && <span className="ml-1 text-[11px]">({dday})</span>}
    </span>
  )
}

export function AssigneeDisplay({ user }: { user: User }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium tracking-tight shrink-0">
        {initials(user.name)}
      </span>
      <span className="text-[13px] text-zinc-700 tracking-tight">{user.name}</span>
    </span>
  )
}
