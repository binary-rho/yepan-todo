import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { safeSend, taskLink } from '@/lib/notifications'

interface DigestResult {
  sent: number
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// dedupe_key 를 미리 예약(insert)해 중복 발송을 막는다.
// 이미 존재하면(unique 충돌) false 를 반환한다.
async function reserve(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  params: { dedupeKey: string; kind: string; userId: string; taskId?: string | null },
): Promise<boolean> {
  const { error } = await supabase.from('notification_log').insert({
    dedupe_key: params.dedupeKey,
    kind: params.kind,
    user_id: params.userId,
    task_id: params.taskId ?? null,
  })
  return !error
}

export async function runDailyDigest(): Promise<DigestResult> {
  const supabase = createSupabaseServiceClient()

  // 무료 플랜 일시정지 방지용 가벼운 쿼리 겸 사용자 로딩.
  const { data: users } = await supabase.from('users').select('id, name')
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, assignee_id, due_date')
    .neq('status', 'done')

  const userList = users ?? []
  const incompleteTasks = tasks ?? []

  const now = new Date()
  const todayStr = dateStr(now)
  const plus2 = new Date(now)
  plus2.setUTCDate(plus2.getUTCDate() + 2)
  const plus2Str = dateStr(plus2)

  const nameById = new Map(userList.map((u) => [u.id, u.name]))

  let sent = 0

  // ─── 담당자별 다이제스트 (담당자당 한 건) ────────────────────────────────────
  const byAssignee = new Map<string, typeof incompleteTasks>()
  for (const task of incompleteTasks) {
    const list = byAssignee.get(task.assignee_id) ?? []
    list.push(task)
    byAssignee.set(task.assignee_id, list)
  }

  for (const [assigneeId, list] of byAssignee) {
    const overdue = list.filter((t) => t.due_date && t.due_date < todayStr)
    const dueToday = list.filter((t) => t.due_date === todayStr)
    const dueIn2 = list.filter((t) => t.due_date === plus2Str)

    // 안내할 내용이 없으면 건너뛴다.
    if (overdue.length === 0 && dueToday.length === 0 && dueIn2.length === 0) continue

    const dedupeKey = `digest:${assigneeId}:${todayStr}`
    const reserved = await reserve(supabase, { dedupeKey, kind: 'digest', userId: assigneeId })
    if (!reserved) continue

    const name = nameById.get(assigneeId) ?? '담당자'
    const lines: string[] = [`[BO 세팅] ${name}님, 미완료 항목 ${list.length}건이 있습니다.`]
    const section = (label: string, items: typeof list) => {
      if (items.length === 0) return
      lines.push(`\n${label} (${items.length}건)`)
      for (const t of items) lines.push(`- ${t.title}\n  ${taskLink(t.id)}`)
    }
    section('⚠️ 마감 초과', overdue)
    section('📌 오늘 마감', dueToday)
    section('🔔 2일 후 마감', dueIn2)

    await safeSend(lines.join('\n'))
    sent += 1
  }

  return { sent }
}
