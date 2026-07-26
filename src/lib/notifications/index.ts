import { getTransport, type Mention } from '@/lib/notifications/transport'

export type { Mention }

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

interface ManualCallTextInput {
  taskId: string
  title: string
  assigneeName: string | null
  // Teams 카드가 <at>이름</at> 을 앞에 붙일 예정이면 문구에 또 이름을 넣지 않는다.
  willTagAssignee: boolean
}

function manualCallText(p: ManualCallTextInput): string {
  const link = taskLink(p.taskId)
  if (!p.assigneeName) {
    return `[BO 세팅] '${p.title}' 항목은 담당자가 아직 없습니다. 확인/담당 지정 부탁드립니다.\n${link}`
  }
  const namePrefix = p.willTagAssignee ? '' : `${p.assigneeName} `
  return `${namePrefix}님, [BO 세팅] '${p.title}' 항목 확인/진행 부탁드립니다.\n${link}`
}

// 알림 팝업에 미리 채워둘 기본 문구. 실제 발송 문구(manualCallText)와 규칙이 같아야 하므로 이 함수 하나만 쓴다.
export function buildManualCallDraft(p: { taskId: string; title: string; assigneeName: string | null }): string {
  return manualCallText({ ...p, willTagAssignee: Boolean(p.assigneeName) })
}

interface ManualCall {
  taskId: string
  title: string
  assigneeName: string | null
  mention?: Mention
  ccMentions?: Mention[]
  // 팝업에서 사용자가 문구를 고쳤으면 그 문구를 그대로 쓴다. 없으면 기본 문구를 만든다.
  text?: string
}

// 사용자가 버튼으로 직접 호출하는 알림. 결과를 돌려줘 화면에서 성공/실패를 표시한다.
// mention 이 있으면 Teams 에서 해당 담당자를 @태그하고, ccMentions 는 본문 끝에 "cc. @이름" 으로 붙는다.
export async function sendManualCall(p: ManualCall): Promise<SendResult> {
  const transport = await getTransport()
  if (!transport) return { ok: false, reason: 'no_webhook' }
  const text = p.text ?? manualCallText({ ...p, willTagAssignee: Boolean(p.mention) })
  try {
    await transport.send({ text, mention: p.mention, ccMentions: p.ccMentions })
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
