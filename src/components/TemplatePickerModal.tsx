'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FileText, ChevronRight } from 'lucide-react'
import type { Environment, Template, TemplateItem } from '@/types'
import { createTasksFromTemplate } from '@/lib/actions'
import { useProjectMember } from '@/components/ProjectMemberProvider'
import { TemplateUseModal } from '@/components/TemplateUseModal'

interface TemplatePickerModalProps {
  templates: Template[]
  itemsByTemplate: Record<string, TemplateItem[]>
  onClose: () => void
  onCreated: () => void
}

// 보드에서 "템플릿" 을 누르면 템플릿 관리 화면으로 이동하지 않고, 저장된 템플릿 중 하나를 골라
// 지금 보고 있는 회차에 바로 항목을 만들 수 있게 한다. 고르면 항목별 담당자 지정 단계로 넘어간다.
export function TemplatePickerModal({ templates, itemsByTemplate, onClose, onCreated }: TemplatePickerModalProps) {
  const router = useRouter()
  const { projectId, members, currentUser } = useProjectMember()
  const [selected, setSelected] = useState<Template | null>(null)

  async function applyTemplate(env: Environment, baseDate: string, assigneeByItemId: Record<string, string>) {
    if (!selected) return { ok: false as const, error: '템플릿을 먼저 선택해주세요.' }
    if (!currentUser) return { ok: false as const, error: '좌측에서 내 정보를 먼저 입력해주세요.' }
    const result = await createTasksFromTemplate(
      projectId,
      { templateId: selected.id, environment: env, baseDate, assigneeByItemId },
      currentUser.id,
    )
    if (result.ok) onCreated()
    return result
  }

  if (selected) {
    return (
      <TemplateUseModal
        template={selected}
        items={itemsByTemplate[selected.id] ?? []}
        members={members}
        onClose={() => setSelected(null)}
        onConfirm={applyTemplate}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded border border-zinc-200 shadow-md w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900 tracking-tight">템플릿으로 항목 생성</h2>
            <p className="text-[11px] text-zinc-400 tracking-tight mt-0.5">사용할 템플릿을 선택해주세요.</p>
          </div>
          <button className="text-zinc-400 hover:text-zinc-600" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-4 overflow-y-auto space-y-1.5">
          {templates.length === 0 && (
            <div className="border border-dashed border-zinc-200 rounded p-8 text-center">
              <FileText size={20} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-[13px] text-zinc-500 tracking-tight">저장된 템플릿이 없습니다.</p>
              <p className="text-[12px] text-zinc-400 mt-1 tracking-tight">템플릿 메뉴에서 반복되는 세팅 묶음을 먼저 만들어주세요.</p>
            </div>
          )}

          {templates.map(template => {
            const itemCount = (itemsByTemplate[template.id] ?? []).length
            const isEmpty = itemCount === 0
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template)}
                disabled={isEmpty}
                title={isEmpty ? '포함된 항목이 없어 생성할 수 없습니다' : undefined}
                className="w-full flex items-center gap-3 p-3 border border-zinc-200 rounded text-left transition-colors enabled:hover:border-zinc-400 enabled:hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 tracking-tight truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-[12px] text-zinc-500 tracking-tight truncate mt-0.5">{template.description}</p>
                  )}
                  <p className="text-[11px] text-zinc-400 tabular-nums tracking-tight mt-1">
                    {isEmpty ? '항목 없음' : `항목 ${itemCount}개`}
                  </p>
                </div>
                <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-500 shrink-0" />
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-zinc-200 shrink-0">
          <button
            className="text-[12px] text-zinc-500 hover:text-zinc-800 tracking-tight transition-colors"
            onClick={() => router.push('/templates')}
          >
            템플릿 관리로 이동
          </button>
          <button
            className="px-3 py-1.5 text-[13px] border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50 transition-colors tracking-tight"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
