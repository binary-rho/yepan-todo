'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Pencil, Check } from 'lucide-react'
import type { User } from '@/types'
import { createMember, updateMember, deleteMember } from '@/lib/actions'
import { PROFILE_USER_ID } from '@/lib/profile'

interface MembersModalProps {
  members: User[]
  onClose: () => void
}

export function MembersModal({ members, onClose }: MembersModalProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function beginEdit(member: User) {
    setError(null)
    setEditingId(member.id)
    setDraftName(member.name)
    setDraftEmail(member.email)
  }

  function saveEdit(memberId: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateMember(memberId, { name: draftName.trim(), email: draftEmail.trim() })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEditingId(null)
      router.refresh()
    })
  }

  function addMember() {
    setError(null)
    startTransition(async () => {
      const result = await createMember({ name: newName.trim(), email: newEmail.trim() })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNewName('')
      setNewEmail('')
      router.refresh()
    })
  }

  function remove(member: User) {
    if (!confirm(`'${member.name}' 멤버를 삭제할까요?`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteMember(member.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">멤버(담당자) 관리</h2>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-zinc-400 tracking-tight">
            이메일은 Teams 알림에서 담당자를 @태그할 때 쓰입니다. 실제 조직(Teams) 이메일을 입력해주세요.
          </p>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            {members.map(member => {
              const isOperator = member.id === PROFILE_USER_ID
              const isEditing = editingId === member.id
              if (isEditing) {
                return (
                  <div key={member.id} className="flex items-center gap-2 p-2 border border-zinc-300 rounded">
                    <input
                      className="w-24 px-2 py-1 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      placeholder="이름"
                    />
                    <input
                      className="flex-1 min-w-0 px-2 py-1 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                      value={draftEmail}
                      onChange={e => setDraftEmail(e.target.value)}
                      placeholder="name@company.com"
                    />
                    <button
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors shrink-0"
                      onClick={() => saveEdit(member.id)}
                      disabled={isPending}
                      aria-label="저장"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                )
              }
              return (
                <div key={member.id} className="flex items-center gap-2 p-2 border border-zinc-100 rounded hover:bg-zinc-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-zinc-900 tracking-tight">{member.name}</span>
                      {isOperator && <span className="text-[10px] text-zinc-400 tracking-tight">(나)</span>}
                    </div>
                    <p className="text-[12px] text-zinc-500 tracking-tight truncate">{member.email}</p>
                  </div>
                  <button
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
                    onClick={() => beginEdit(member)}
                    aria-label="수정"
                  >
                    <Pencil size={13} />
                  </button>
                  {!isOperator && (
                    <button
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                      onClick={() => remove(member)}
                      disabled={isPending}
                      aria-label="삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-zinc-100">
            <p className="text-[12px] font-medium text-zinc-600 tracking-tight mb-2">멤버 추가</p>
            <div className="flex items-center gap-2">
              <input
                className="w-24 px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="이름"
              />
              <input
                className="flex-1 min-w-0 px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="name@company.com"
              />
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40 shrink-0"
                onClick={addMember}
                disabled={isPending || !newName.trim() || !newEmail.trim()}
              >
                <Plus size={13} />
                추가
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
