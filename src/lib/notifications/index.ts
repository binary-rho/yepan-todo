import { getTransport, type Mention } from '@/lib/notifications/transport'

function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  return (url ?? 'http://localhost:3000').replace(/\/$/, '')
}

// 모든 메시지는 해당 항목의 /tasks/[id] 절대 경로 링크를 포함한다.
export function taskLink(taskId: string): string {
  return `${getAppBaseUrl()}/tasks/${taskId}`
}

// 알림 실패가 사용자 액션 전체를 실패시키지 않도록 감싼다.
export async function safeSend(text: string): Promise<void> {
  try {
    const transport = await getTransport()
    // 웹훅 URL 이 설정되지 않았으면 발송하지 않는다.
    if (!transport) return
    await transport.send({ text })
  } catch (e) {
    console.error('[notification] 발송 실패', e)
  }
}

export type SendResult = { ok: true } | { ok: false; reason: 'no_webhook' | 'failed' }

// 사용자가 버튼으로 직접 호출하는 알림. 결과를 돌려줘 화면에서 성공/실패를 표시한다.
// mention 이 있으면 Teams 에서 해당 담당자를 @태그한다.
export async function sendManualCall(p: {
  taskId: string
  title: string
  assigneeName: string
  mention?: Mention
}): Promise<SendResult> {
  const transport = await getTransport()
  if (!transport) return { ok: false, reason: 'no_webhook' }
  // 멘션이 있으면 카드가 <at>이름</at> 을 앞에 붙이므로 텍스트에 이름을 넣지 않는다.
  const namePrefix = p.mention ? '' : `${p.assigneeName} `
  try {
    await transport.send({
      text: `${namePrefix}님, [BO 세팅] '${p.title}' 항목 확인/진행 부탁드립니다.\n${taskLink(p.taskId)}`,
      mention: p.mention,
    })
    return { ok: true }
  } catch (e) {
    console.error('[notification] 수동 호출 실패', e)
    return { ok: false, reason: 'failed' }
  }
}

export async function notifyTaskAssigned(p: { taskId: string; title: string; assigneeName: string }): Promise<void> {
  await safeSend(
    `[BO 세팅] ${p.assigneeName}님, 새 세팅 항목이 배정되었습니다.\n- ${p.title}\n${taskLink(p.taskId)}`,
  )
}

export async function notifyReviewRequested(p: { taskId: string; title: string; assigneeName: string }): Promise<void> {
  await safeSend(
    `[BO 세팅] 완료 요청이 접수되었습니다. 관리자 검토가 필요합니다.\n- ${p.title} (담당: ${p.assigneeName})\n${taskLink(p.taskId)}`,
  )
}

export async function notifyRejected(p: { taskId: string; title: string; assigneeName: string; reason: string }): Promise<void> {
  await safeSend(
    `[BO 세팅] ${p.assigneeName}님, 항목이 반려되었습니다.\n- ${p.title}\n- 사유: ${p.reason}\n${taskLink(p.taskId)}`,
  )
}
