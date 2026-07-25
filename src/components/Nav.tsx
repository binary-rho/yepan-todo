'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users } from 'lucide-react'
import { MembersModal } from '@/components/MembersModal'
import { useCurrentUser } from '@/components/CurrentUserProvider'

const NAV_ITEMS = [
  { label: '보드', href: '/' },
  { label: '템플릿', href: '/templates' },
  { label: '보관함', href: '/archive' },
] as const

export function Nav() {
  const pathname = usePathname()
  const { currentUser, members, selectUser } = useCurrentUser()
  const [membersOpen, setMembersOpen] = useState(false)

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

      <div className="px-4 py-3 border-t border-zinc-100 space-y-2">
        <div>
          <label className="block text-[11px] text-zinc-400 tracking-tight mb-1">현재 사용자</label>
          {members.length > 0 ? (
            <select
              className="w-full px-2 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight"
              value={currentUser?.id ?? ''}
              onChange={e => selectUser(e.target.value)}
            >
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          ) : (
            <p className="text-[12px] text-zinc-400 tracking-tight">멤버를 먼저 추가해주세요.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className="flex items-center gap-1 text-[12px] text-zinc-400 hover:text-zinc-600 tracking-tight transition-colors"
        >
          <Users size={11} />
          멤버 관리
        </button>
      </div>

      {membersOpen && <MembersModal members={members} onClose={() => setMembersOpen(false)} />}
    </aside>
  )
}
