import { Nav } from '@/components/Nav'
import { CurrentIdentityProvider } from '@/components/CurrentIdentityProvider'

// "현재 사용자"는 회차와 무관한 브라우저 설정(본인이 직접 입력)이라 전역 레이아웃에서 관리한다.
// 회차별 멤버 목록/멤버 관리는 각 프로젝트 화면에서 다룬다. (ProjectMemberProvider 참고)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentIdentityProvider>
      <div className="flex min-h-screen bg-background font-[Pretendard,system-ui,sans-serif]">
        <Nav />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    </CurrentIdentityProvider>
  )
}
