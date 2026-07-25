// 메신저 전송부. 기본은 단방향 웹훅 발송이다.
// MS Teams 로 사람을 @멘션(태그)하려면 순수 텍스트가 아니라 Adaptive Card + msteams.entities 가 필요하다.
// 따라서 mention 정보가 있으면 Teams Adaptive Card 페이로드를, 없으면 { text } 를 보낸다.
// 스펙이 바뀌면 이 파일 한 곳만 고치면 된다.

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { readSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'

// Teams 멘션은 사용자의 조직 이메일(UPN) 또는 Azure AD object id 를 mentioned.id 로 사용한다.
export interface Mention {
  id: string
  name: string
}

export interface NotificationMessage {
  text: string
  mention?: Mention
}

export interface NotificationTransport {
  send(message: NotificationMessage): Promise<void>
}

const MENTION_TAG_OPEN = '<at>'
const MENTION_TAG_CLOSE = '</at>'

// Teams Adaptive Card 로 특정 사용자를 @멘션하는 페이로드를 만든다.
// 본문 맨 앞에 <at>이름</at> 을 넣고, msteams.entities 에 동일 태그를 매핑해야 실제 태그가 걸린다.
function buildTeamsMentionPayload(text: string, mention: Mention) {
  const mentionText = `${MENTION_TAG_OPEN}${mention.name}${MENTION_TAG_CLOSE}`
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.0',
          body: [{ type: 'TextBlock', text: `${mentionText} ${text}`, wrap: true }],
          msteams: {
            entities: [
              {
                type: 'mention',
                text: mentionText,
                mentioned: { id: mention.id, name: mention.name },
              },
            ],
          },
        },
      },
    ],
  }
}

class WebhookTransport implements NotificationTransport {
  constructor(private readonly url: string) {}

  async send(message: NotificationMessage): Promise<void> {
    const body = message.mention
      ? buildTeamsMentionPayload(message.text, message.mention)
      : { text: message.text }

    await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
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
