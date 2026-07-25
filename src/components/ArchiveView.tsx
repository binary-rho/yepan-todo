'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Trash2, ListChecks } from 'lucide-react'
import type { Project } from '@/types'
import { formatDate } from '@/lib/date'
import { deleteProject } from '@/lib/actions'

interface ArchiveViewProps {
  projects: Project[]
  taskCounts: Record<string, number>
}

export function ArchiveView({ projects, taskCounts }: ArchiveViewProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function remove(project: Project) {
    if (!confirm(`'${project.name}' 대시보드를 삭제할까요? 소속된 항목·코멘트·메모가 모두 함께 삭제되며 되돌릴 수 없습니다.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteProject(project.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex-1 min-w-0 px-6 py-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Archive size={15} className="text-zinc-400" />
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">보관함</h1>
        <span className="text-[12px] text-zinc-400 tabular-nums tracking-tight">{projects.length}</span>
      </div>

      {error && (
        <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded">
          <p className="text-[12px] text-red-700 tracking-tight">{error}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded p-8 text-center">
          <p className="text-[13px] text-zinc-400 tracking-tight">보관된 대시보드가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-zinc-200 rounded p-4 flex items-center justify-between gap-4 hover:border-zinc-300 transition-colors cursor-pointer"
              onClick={() => router.push(`/?project=${project.id}`)}
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-zinc-900 tracking-tight truncate">{project.name}</p>
                {project.description && (
                  <p className="text-[12px] text-zinc-500 tracking-tight mt-0.5 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400 tracking-tight">
                  {project.archivedAt && <span>{formatDate(project.archivedAt)} 보관</span>}
                  <span className="flex items-center gap-1">
                    <ListChecks size={11} />
                    {taskCounts[project.id] ?? 0}건
                  </span>
                </div>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-zinc-200 rounded text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors tracking-tight shrink-0 whitespace-nowrap disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(project)
                }}
                disabled={isPending}
              >
                <Trash2 size={12} />
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
