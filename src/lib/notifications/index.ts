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

// 실패 사유를 추측해서 안내하지 않도록, 전송부가 알려준 원문(상태 코드 등)을 detail 로 함께 올린다.
export type SendResult = { ok: true } | { ok: false; reason: 'no_webhook' } | { ok: false; reason: 'failed'; detail: string | null }

// 담당자가 없는 항목도 알림을 보낼 수 있다. 이때는 부를 사람이 없으니 태그 없이 채널에만 알린다.
const UNASSIGNED_LABEL = '미지정'

interface ManualCall {
  taskId: string
  title: string
  assigneeName: string | null
  mention?: Mention
}

function manualCallText(p: ManualCall): string {
  const link = taskLink(p.taskId)
  if (!p.assigneeName) {
    return `[BO 세팅] '${p.title}' 항목은 담당자가 아직 없습니다. 확인/담당 지정 부탁드립니다.\n${link}`
  }
  // 멘션이 있으면 카드가 <at>이름</at> 을 앞에 붙이므로 텍스트에 이름을 넣지 않는다.
  const namePrefix = p.mention ? '' : `${p.assigneeName} `
  return `${namePrefix}님, [BO 세팅] '${p.title}' 항목 확인/진행 부탁드립니다.\n${link}`
}

// 사용자가 버튼으로 직접 호출하는 알림. 결과를 돌려줘 화면에서 성공/실패를 표시한다.
// mention 이 있으면 Teams 에서 해당 담당자를 @태그한다.
export async function sendManualCall(p: ManualCall): Promise<SendResult> {
  const transport = await getTransport()
  if (!transport) return { ok: false, reason: 'no_webhook' }
  try {
    await transport.send({ text: manualCallText(p), mention: p.mention })
    return { ok: true }
  } catch (e) {
    console.error('[notification] 수동 호출 실패', e)
    return { ok: false, reason: 'failed', detail: e instanceof Error ? e.message : null }
  }
}

export async function notifyTaskAssigned(p: { taskId: string; title: string; assigneeName: string }): Promise<void> {
  await safeSend(
    `[BO 세팅] ${p.assigneeName}님, 새 세팅 항목이 배정되었습니다.\n- ${p.title}\n${taskLink(p.taskId)}`,
  )
}

export async function notifyReviewRequested(p: { taskId: string; title: string; assigneeName: string | null }): Promise<void> {
  await safeSend(
    `[BO 세팅] 완료 요청이 접수되었습니다. 관리자 검토가 필요합니다.\n- ${p.title} (담당: ${p.assigneeName ?? UNASSIGNED_LABEL})\n${taskLink(p.taskId)}`,
  )
}

export async function notifyRejected(p: { taskId: string; title: string; assigneeName: string | null; reason: string }): Promise<void> {
  const greeting = p.assigneeName ? `${p.assigneeName}님, ` : ''
  await safeSend(
    `[BO 세팅] ${greeting}다시 설정이 필요한 항목이 있습니다.\n- ${p.title}\n- 사유: ${p.reason}\n${taskLink(p.taskId)}`,
  )
}
