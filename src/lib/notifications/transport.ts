// 메신저 전송부. 기본은 단방향 웹훅 발송이다. 스펙이 바뀌면 이 파일 한 곳만 고치면 된다.
//
// 대상은 Teams Workflows(Power Automate) 웹훅이며, 이 엔드포인트는 Adaptive Card 형식만 받는다.
// 레거시 Incoming Webhook 커넥터가 받아줬던 { text } 를 보내면 엔드포인트는 202 를 주지만
// 흐름 안의 "Post card in a chat or channel" 이 카드 검증에서 실패해 채널에는 아무것도 올라가지 않는다.
// 그래서 멘션이 없어도 항상 카드로 보낸다.
//
// 사람을 @멘션(태그)하려면 본문의 <at>이름</at> 과 msteams.entities 의 text 가 정확히 같아야 하고,
// mentioned.id 는 실제 Teams 계정 이메일(UPN) 또는 Azure AD object id 여야 한다.

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { readSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'

// Teams 멘션은 사용자의 조직 이메일(UPN) 또는 Azure AD object id 를 mentioned.id 로 사용한다.
export interface Mention {
  id: string
  name: string
}

export interface NotificationMessage {
  text: string
  // 앞쪽에 붙는 기본 태그(주로 담당자).
  mention?: Mention
  // 본문 끝에 "cc. @이름1, @이름2" 로 붙는 참조 태그.
  ccMentions?: Mention[]
}

export interface NotificationTransport {
  send(message: NotificationMessage): Promise<void>
}

const MENTION_TAG_OPEN = '<at>'
const MENTION_TAG_CLOSE = '</at>'

// Teams 가 렌더할 수 있는 Adaptive Card 스키마 상한은 1.5 다. 단순 텍스트 카드라 1.4 로 충분하다.
const CARD_VERSION = '1.4'

// 오류 메시지에 응답 본문을 그대로 다 담으면 화면이 망가진다. 원인 파악에 필요한 앞부분만 남긴다.
const ERROR_DETAIL_MAX_LENGTH = 200

interface TextBlock {
  type: 'TextBlock'
  text: string
  wrap: true
  spacing: 'None' | 'Medium'
}

// Adaptive Card 의 TextBlock 은 문자열 안의 개별 개행(\n)을 그대로 렌더하지 않는다.
// 줄바꿈이 유지되도록 한 줄을 TextBlock 하나로 나눠 담고, 빈 줄은 위쪽 여백으로 바꾼다.
function toTextBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = []
  let precededByBlankLine = false
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      precededByBlankLine = true
      continue
    }
    blocks.push({ type: 'TextBlock', text: line, wrap: true, spacing: precededByBlankLine ? 'Medium' : 'None' })
    precededByBlankLine = false
  }
  // 카드는 body 가 비어 있으면 게시되지 않는다.
  return blocks.length > 0 ? blocks : [{ type: 'TextBlock', text, wrap: true, spacing: 'None' }]
}

// msteams.width 가 없으면 카드가 좁은 폭으로 렌더돼 링크가 잘려 보인다.
function buildCard(body: TextBlock[], msteamsMention: object) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: CARD_VERSION,
          body,
          msteams: { width: 'Full', ...msteamsMention },
        },
      },
    ],
  }
}

function mentionTagOf(mention: Mention): string {
  return `${MENTION_TAG_OPEN}${mention.name}${MENTION_TAG_CLOSE}`
}

// CC 는 "cc. @이름1, @이름2" 한 줄로 본문 맨 끝에 붙는다.
const CC_LINE_PREFIX = 'cc.'

function buildCardPayload({ text, mention, ccMentions }: NotificationMessage) {
  const ccLine = ccMentions && ccMentions.length > 0
    ? `${CC_LINE_PREFIX} ${ccMentions.map(mentionTagOf).join(', ')}`
    : null
  const bodyWithCc = ccLine ? `${text}\n\n${ccLine}` : text
  const finalText = mention ? `${mentionTagOf(mention)} ${bodyWithCc}` : bodyWithCc

  const allMentions = [...(mention ? [mention] : []), ...(ccMentions ?? [])]
  if (allMentions.length === 0) return buildCard(toTextBlocks(finalText), {})

  const entities = allMentions.map((m) => ({ type: 'mention', text: mentionTagOf(m), mentioned: { id: m.id, name: m.name } }))
  return buildCard(toTextBlocks(finalText), { entities })
}

class WebhookTransport implements NotificationTransport {
  constructor(private readonly url: string) {}

  // 실패를 조용히 넘기면 "설정했는데 알림이 안 온다" 를 추적할 수 없으므로 던진다.
  // 다만 이 검사로 잡히는 건 전송 단계 실패(URL 오류·권한·레이트리밋)까지다. 흐름 안에서 실패하면
  // 엔드포인트는 그대로 202 를 주므로, 그때는 Power Automate 실행 기록을 봐야 한다.
  async send(message: NotificationMessage): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCardPayload(message)),
    })
    if (response.ok) return

    const detail = await response.text().catch(() => '')
    const trimmed = detail.trim().slice(0, ERROR_DETAIL_MAX_LENGTH)
    throw new Error(`웹훅 응답 ${response.status}${trimmed ? `: ${trimmed}` : ''}`)
  }
}

// 웹훅 URL 은 관리자가 화면에서 입력한 값(app_settings)만 사용한다.
// 값이 없으면 null 을 반환하고, 알림은 발송하지 않는다.
export async function getTransport(): Promise<NotificationTransport | null> {
  let url: string | null = null
  try {
    url = await readSetting(createSupabaseServiceClient(), WEBHOOK_SETTING_KEY)
  } catch {
    return null
  }
  const trimmed = url?.trim()
  return trimmed ? new WebhookTransport(trimmed) : null
}
