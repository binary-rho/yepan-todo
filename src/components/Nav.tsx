'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@/types'
import { initials } from '@/lib/date'
import { logout } from '@/lib/auth-actions'

const NAV_ITEMS = [
  { label: '내 할 일', href: '/', adminOnly: false },
  { label: '전체 보드', href: '/board', adminOnly: true },
  { label: '템플릿', href: '/templates', adminOnly: true },
] as const

export function Nav({ currentUser }: { currentUser: User }) {
  const pathname = usePathname()
  const isAdmin = currentUser.role === 'admin'

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-44 shrink-0 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-zinc-100">
        <p className="text-[13px] font-semibold text-zinc-900 tracking-tight">BO 세팅 관리</p>
      </div>

      <nav className="flex-1 px-2 py-2">
        {NAV_ITEMS.filter(i => !i.adminOnly || isAdmin).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`block w-full text-left px-3 py-1.5 text-[13px] rounded tracking-tight transition-colors mb-0.5 ${
              isActive(item.href)
                ? 'bg-zinc-100 text-zinc-900 font-medium'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-200 text-zinc-600 text-[10px] font-medium shrink-0">
            {initials(currentUser.name)}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-900 tracking-tight truncate">{currentUser.name}</p>
            <p className="text-[11px] text-zinc-400 tracking-tight">{currentUser.role === 'admin' ? '관리자' : '담당자'}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-[12px] text-zinc-400 hover:text-zinc-600 tracking-tight transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  )
}
