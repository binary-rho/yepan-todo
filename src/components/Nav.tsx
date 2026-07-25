'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: '보드', href: '/' },
  { label: '템플릿', href: '/templates' },
  { label: '보관함', href: '/archive' },
] as const

// "현재 사용자" 선택과 멤버 관리는 회차(프로젝트)에 귀속된 정보라 이 전역 메뉴가 아니라
// 각 프로젝트 화면(보드 등)의 헤더에 있다. (CurrentUserPicker 참고)
export function Nav() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-zinc-100">
        <p className="text-[14px] font-semibold text-zinc-900 tracking-tight">BO 세팅 관리</p>
      </div>

      <nav className="flex-1 px-2.5 py-2.5">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`block w-full text-left px-3 py-2 text-[13px] rounded tracking-tight transition-colors mb-0.5 ${
              isActive(item.href)
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
