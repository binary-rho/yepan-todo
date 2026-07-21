import { AlertCircle } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getTasksForAssignee, getLatestRejectionReasons } from '@/lib/db/queries'
import { isOverdue } from '@/lib/date'
import { TaskCard } from '@/components/TaskCard'

export const dynamic = 'force-dynamic'

export default async function AssigneePage() {
  const user = await requireUser()
  const [allMine, rejectionReasons] = await Promise.all([
    getTasksForAssignee(user.id),
    getLatestRejectionReasons(),
  ])

  const mine = allMine.filter(t => t.status !== 'done')
  const overdue = mine.filter(t => isOverdue(t.dueDate))
  const rest = mine.filter(t => !isOverdue(t.dueDate))

  if (mine.length === 0) {
    return (
      <div className="px-6 py-6">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight mb-4">내 할 일</h1>
        <div className="border border-dashed border-zinc-200 rounded p-10 text-center">
          <p className="text-[14px] text-zinc-500 tracking-tight">처리할 항목이 없습니다.</p>
          <p className="text-[13px] text-zinc-400 mt-1 tracking-tight">모든 세팅 항목이 완료되었습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">내 할 일</h1>
        <div className="flex items-center gap-4 text-[13px] tabular-nums">
          <span className="text-zinc-500 tracking-tight">미완료 <span className="font-medium text-zinc-900">{mine.length}</span>건</span>
          {overdue.length > 0 && (
            <span className="text-red-600 tracking-tight font-medium">{overdue.length}건 마감 초과</span>
          )}
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={12} className="text-red-500" />
            <span className="text-[12px] font-medium text-red-600 tracking-tight">마감 초과</span>
          </div>
          <div className="space-y-2">
            {overdue.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={user}
                rejectionReason={rejectionReasons[task.id] ?? null}
                showStatusActions
              />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {overdue.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12px] font-medium text-zinc-500 tracking-tight">진행 중</span>
            </div>
          )}
          <div className="space-y-2">
            {rest.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={user}
                rejectionReason={rejectionReasons[task.id] ?? null}
                showStatusActions
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
