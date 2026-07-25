import { Nav } from '@/components/Nav'

// 멤버(현재 사용자 선택/멤버 관리)는 이제 회차(프로젝트)에 귀속되므로 전역 레이아웃이 아니라
// 각 프로젝트 화면(보드/템플릿/항목 상세)에서 그 회차의 멤버만 다룬다. (CurrentUserProvider 참고)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background font-[Pretendard,system-ui,sans-serif]">
      <Nav />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
