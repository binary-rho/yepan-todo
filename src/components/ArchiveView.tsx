'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, RotateCcw, ListChecks } from 'lucide-react'
import type { Project } from '@/types'
import { formatDate } from '@/lib/date'
import { setProjectArchived } from '@/lib/actions'

interface ArchiveViewProps {
  projects: Project[]
  taskCounts: Record<string, number>
}

export function ArchiveView({ projects, taskCounts }: ArchiveViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function reopen(projectId: string) {
    startTransition(async () => {
      const result = await setProjectArchived(projectId, false)
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="flex-1 min-w-0 px-6 py-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Archive size={15} className="text-zinc-400" />
        <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">보관함</h1>
        <span className="text-[12px] text-zinc-400 tabular-nums tracking-tight">{projects.length}</span>
      </div>

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
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight shrink-0 whitespace-nowrap disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation()
                  reopen(project.id)
                }}
                disabled={isPending}
              >
                <RotateCcw size={12} />
                재개
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
