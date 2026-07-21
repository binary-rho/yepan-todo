import { AlertCircle } from 'lucide-react'
import type { Environment, TaskStatus } from '@/types'
import { STATUS_CONFIG, ENV_CONFIG } from '@/lib/constants'

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, cls } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border tracking-tight tabular-nums ${cls}`}>
      {label}
    </span>
  )
}

export function EnvBadge({ env }: { env: Environment }) {
  const { label, cls } = ENV_CONFIG[env]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border tracking-tight ${cls}`}>
      {label}
    </span>
  )
}

export function BlockingBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium tracking-tight">
      <AlertCircle size={10} />
      차단
    </span>
  )
}
