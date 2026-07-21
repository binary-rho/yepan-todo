// 메신저 전송부. 웹훅은 단방향 발송만 가능하다고 전제한다.
// 페이로드는 { text: string } 이 기본이며, 스펙 확정 시 이 파일 한 곳만 고치면 된다.

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

class ConsoleTransport implements NotificationTransport {
  async send(message: NotificationMessage): Promise<void> {
    console.log('[notification]', message.text)
  }
}

// MESSENGER_WEBHOOK_URL 이 없으면 콘솔 출력으로 대체 동작한다.
export function getTransport(): NotificationTransport {
  const url = process.env.MESSENGER_WEBHOOK_URL
  return url ? new WebhookTransport(url) : new ConsoleTransport()
}
