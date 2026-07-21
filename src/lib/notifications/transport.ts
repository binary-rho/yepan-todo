// 메신저 전송부. 웹훅은 단방향 발송만 가능하다고 전제한다.
// 페이로드는 { text: string } 이 기본이며, 스펙 확정 시 이 파일 한 곳만 고치면 된다.

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { readSetting, WEBHOOK_SETTING_KEY } from '@/lib/db/settings'

export interface NotificationMessage {
  text: string
}

export interface NotificationTransport {
  send(message: NotificationMessage): Promise<void>
}

class WebhookTransport implements NotificationTransport {
  constructor(private readonly url: string) {}

  async send(message: NotificationMessage): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message.text }),
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
