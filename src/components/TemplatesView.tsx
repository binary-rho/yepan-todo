'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Environment, Template } from '@/types'
import { createTasksFromTemplate } from '@/lib/actions'
import { TemplateUseModal } from '@/components/TemplateUseModal'

interface TemplatesViewProps {
  templateList: Template[]
  itemsByTemplate: Record<string, string[]>
}

export function TemplatesView({ templateList, itemsByTemplate }: TemplatesViewProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [useModal, setUseModal] = useState<Template | null>(null)

  async function handleConfirm(templateId: string, env: Environment, baseDate: string) {
    const result = await createTasksFromTemplate({ templateId, environment: env, baseDate })
    if (result.ok) {
      setUseModal(null)
      router.refresh()
    }
    return result
  }

  return (
    <div className="px-6 py-6">
      <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight mb-5">템플릿</h1>

      <div className="space-y-3 max-w-xl">
        {templateList.map(tpl => (
          <div
            key={tpl.id}
            className={`bg-white border rounded transition-colors ${expanded === tpl.id ? 'border-zinc-400' : 'border-zinc-200'}`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors rounded"
              onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-zinc-900 tracking-tight">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">{tpl.description}</p>
                  )}
                  <p className="text-[12px] text-zinc-400 mt-1 tabular-nums tracking-tight">항목 {tpl.itemCount}개</p>
                </div>
                <button
                  className="shrink-0 px-3 py-1.5 text-[12px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight"
                  onClick={e => { e.stopPropagation(); setUseModal(tpl) }}
                >
                  이 템플릿으로 생성
                </button>
              </div>
            </div>

            {expanded === tpl.id && (
              <div className="px-4 pb-4 border-t border-zinc-100">
                <p className="text-[12px] font-medium text-zinc-500 tracking-tight mt-3 mb-2">포함 항목</p>
                <div className="space-y-1">
                  {(itemsByTemplate[tpl.id] ?? []).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b border-zinc-50 last:border-0">
                      <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight w-4 shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="text-[13px] text-zinc-700 tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {useModal && (
        <TemplateUseModal
          template={useModal}
          onClose={() => setUseModal(null)}
          onConfirm={(env, baseDate) => handleConfirm(useModal.id, env, baseDate)}
        />
      )}
    </div>
  )
}
