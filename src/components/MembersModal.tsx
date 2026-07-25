'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Pencil, Check, DownloadCloud } from 'lucide-react'
import type { TeamRole, User } from '@/types'
import { TEAM_ROLES } from '@/lib/constants'
import { createMember, updateMember, deleteMember, createMembersBulk, importTeamsMembers } from '@/lib/actions'

interface MembersModalProps {
  projectId: string
  members: User[]
  onClose: () => void
}

type TeamRoleOrUnset = TeamRole | ''

interface ImportedMember {
  name: string
  email: string
  alreadyExists: boolean
  selected: boolean
}

function TeamRoleSelect({ value, onChange }: { value: TeamRoleOrUnset; onChange: (v: TeamRoleOrUnset) => void }) {
  return (
    <select
      className="w-20 px-2 py-1 border border-zinc-200 rounded text-[12px] tracking-tight outline-none focus:border-zinc-400 bg-white shrink-0"
      value={value}
      onChange={e => onChange(e.target.value as TeamRoleOrUnset)}
    >
      <option value="">미정</option>
      {TEAM_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
    </select>
  )
}

export function MembersModal({ projectId, members, onClose }: MembersModalProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftRole, setDraftRole] = useState<TeamRoleOrUnset>('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<TeamRoleOrUnset>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [importedMembers, setImportedMembers] = useState<ImportedMember[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, startImporting] = useTransition()
  const [isAddingImported, startAddingImported] = useTransition()

  function beginEdit(member: User) {
    setError(null)
    setEditingId(member.id)
    setDraftName(member.name)
    setDraftEmail(member.email)
    setDraftRole(member.teamRole ?? '')
  }

  function saveEdit(memberId: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateMember(memberId, { name: draftName.trim(), email: draftEmail.trim(), teamRole: draftRole || null })
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
      const result = await createMember(projectId, { name: newName.trim(), email: newEmail.trim(), teamRole: newRole || null })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNewName('')
      setNewEmail('')
      setNewRole('')
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

  function runImport() {
    setImportError(null)
    setImportedMembers(null)
    startImporting(async () => {
      const result = await importTeamsMembers()
      if (!result.ok) {
        setImportError(result.error)
        return
      }
      const existingEmails = new Set(members.map(m => m.email.toLowerCase()))
      setImportedMembers(
        result.members.map(m => ({
          name: m.name,
          email: m.email,
          alreadyExists: existingEmails.has(m.email.toLowerCase()),
          selected: !existingEmails.has(m.email.toLowerCase()),
        })),
      )
    })
  }

  function toggleImported(email: string) {
    setImportedMembers(prev => prev?.map(m => (m.email === email ? { ...m, selected: !m.selected } : m)) ?? null)
  }

  function addSelectedImported() {
    if (!importedMembers) return
    const toAdd = importedMembers.filter(m => m.selected && !m.alreadyExists)
    if (toAdd.length === 0) return
    setImportError(null)
    startAddingImported(async () => {
      const result = await createMembersBulk(projectId, toAdd.map(({ name, email }) => ({ name, email })))
      if (!result.ok) {
        setImportError(result.error)
        return
      }
      setImportedMembers(null)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">멤버(담당자) 관리</h2>
            <p className="text-[11px] text-zinc-400 tracking-tight mt-0.5">지금 보고 있는 회차에만 적용됩니다.</p>
          </div>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-400 tracking-tight flex-1">
              이메일은 Teams 알림에서 담당자를 @태그할 때 쓰입니다. 실제 조직(Teams) 이메일을 입력해주세요.
            </p>
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 disabled:opacity-50"
              onClick={runImport}
              disabled={isImporting}
            >
              <DownloadCloud size={12} />
              {isImporting ? '가져오는 중...' : '팀즈에서 가져오기'}
            </button>
          </div>

          {importError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{importError}</p>
            </div>
          )}

          {importedMembers && (
            <div className="border border-zinc-200 rounded p-3 space-y-2">
              <p className="text-[12px] font-medium text-zinc-600 tracking-tight">
                팀즈에서 {importedMembers.length}명을 찾았습니다. 추가할 멤버를 선택해주세요.
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importedMembers.map(m => (
                  <label
                    key={m.email}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-[13px] tracking-tight ${
                      m.alreadyExists ? 'text-zinc-300' : 'text-zinc-700 cursor-pointer hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-zinc-300 focus:ring-0"
                      checked={m.selected}
                      disabled={m.alreadyExists}
                      onChange={() => toggleImported(m.email)}
                    />
                    <span className="flex-1 min-w-0 truncate">{m.name} <span className="text-zinc-400">({m.email})</span></span>
                    {m.alreadyExists && <span className="text-[11px] shrink-0">이미 등록됨</span>}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="px-2.5 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-700 tracking-tight"
                  onClick={() => setImportedMembers(null)}
                >
                  닫기
                </button>
                <button
                  className="px-3 py-1.5 text-[12px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
                  onClick={addSelectedImported}
                  disabled={isAddingImported || importedMembers.every(m => !m.selected || m.alreadyExists)}
                >
                  선택 추가
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            {members.map(member => {
              const isEditing = editingId === member.id
              if (isEditing) {
                return (
                  <div key={member.id} className="flex items-center gap-2 p-2 border border-zinc-300 rounded">
                    <input
                      className="w-20 px-2 py-1 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
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
                    <TeamRoleSelect value={draftRole} onChange={setDraftRole} />
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
                      <span className="text-[11px] text-zinc-400 tracking-tight">{member.teamRole ?? '미정'}</span>
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
                  <button
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                    onClick={() => remove(member)}
                    disabled={isPending}
                    aria-label="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-zinc-100">
            <p className="text-[12px] font-medium text-zinc-600 tracking-tight mb-2">멤버 추가</p>
            <div className="flex items-center gap-2">
              <input
                className="w-20 px-2 py-1.5 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400"
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
              <TeamRoleSelect value={newRole} onChange={setNewRole} />
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
