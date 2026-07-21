import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BO 세팅 관리',
  description: 'BO 세팅 요청 추적 및 담당자 알림 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
