const MS_PER_DAY = 86_400_000
export const DUE_SOON_THRESHOLD_DAYS = 3

function startOfToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function getDday(dueDate: string | null): string | null {
  if (!dueDate) return null
  const diff = Math.ceil((new Date(dueDate).getTime() - startOfToday().getTime()) / MS_PER_DAY)
  if (diff === 0) return 'D-day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

export function isOverdue(dueDate: string | null): boolean {
  return !!dueDate && new Date(dueDate) < startOfToday()
}

export function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) return false
  const diff = Math.ceil((new Date(dueDate).getTime() - startOfToday().getTime()) / MS_PER_DAY)
  return diff >= 0 && diff <= DUE_SOON_THRESHOLD_DAYS
}

// yyyy-mm-dd 에 일수를 더한다. 로컬 시간대에 따라 하루씩 밀리지 않도록 UTC 기준으로 계산한다.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDate(s: string): string {
  const d = new Date(s)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(s: string): string {
  const d = new Date(s)
  return `${formatDate(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function initials(name: string): string {
  return name.slice(0, 2)
}
