'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2 } from 'lucide-react'
import type { ProjectNote } from '@/types'
import { formatDateTime } from '@/lib/date'
import { addProjectNote, deleteProjectNote } from '@/lib/actions'
import { useCurrentUser } from '@/components/CurrentUserProvider'

interface ProjectNotesPanelProps {
  projectId: string
  notes: ProjectNote[]
  readOnly: boolean
  onClose: () => void
}

export function ProjectNotesPanel({ projectId, notes, readOnly, onClose }: ProjectNotesPanelProps) {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    if (!body.trim()) return
    if (!currentUser) {
      setError('작업할 사용자를 먼저 선택해주세요.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addProjectNote({ projectId, body: body.trim() }, currentUser.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setBody('')
      router.refresh()
    })
  }

  function remove(noteId: string) {
    startTransition(async () => {
      await deleteProjectNote(noteId)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25" />
      <div
        className="relative bg-white w-full max-w-sm h-full shadow-lg border-l border-zinc-200 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">메모 / 이슈 로그</h2>
            <p className="text-[11px] text-zinc-400 tracking-tight">사업이 공유 안 해준 맥락·QA 이슈를 기록해 두세요.</p>
          </div>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        {!readOnly && (
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <textarea
              className="w-full px-3 py-2 border border-zinc-200 rounded text-[13px] tracking-tight outline-none focus:border-zinc-400 resize-none"
              rows={3}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="예) 36개월 할부 결제 오류 — 월요일부터 열리도록 토스와 협의됨(사업 미공유)"
            />
            {error && <p className="text-[11px] text-red-500 mt-1 tracking-tight">{error}</p>}
            <div className="flex justify-end mt-2">
              <button
                className="px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
                onClick={submit}
                disabled={!body.trim() || isPending}
              >
                기록
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {notes.length === 0 && (
            <p className="text-[12px] text-zinc-400 tracking-tight text-center py-8">기록된 메모가 없습니다.</p>
          )}
          {notes.map(note => (
            <div key={note.id} className="border border-zinc-200 rounded p-3 group">
              <p className="text-[13px] text-zinc-700 tracking-tight leading-relaxed whitespace-pre-wrap">{note.body}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight">
                  {note.authorName} · {formatDateTime(note.createdAt)}
                </span>
                {!readOnly && (
                  <button
                    className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => remove(note.id)}
                    aria-label="메모 삭제"
                    disabled={isPending}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
