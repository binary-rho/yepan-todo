'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Environment, Template, TemplateItem, User } from '@/types'
import { createTasksFromTemplate, deleteTemplate } from '@/lib/actions'
import { TemplateUseModal } from '@/components/TemplateUseModal'
import { TemplateEditorModal } from '@/components/TemplateEditorModal'
import { useProjectMember } from '@/components/ProjectMemberProvider'
import { ProjectMembersButton } from '@/components/ProjectMembersButton'
import { MembershipAlert } from '@/components/MembershipAlert'

interface TemplatesViewProps {
  templateList: Template[]
  itemsByTemplate: Record<string, TemplateItem[]>
  members: User[]
  activeProject: { id: string; name: string } | null
}

type EditorState = { mode: 'create' } | { mode: 'edit'; template: Template }

export function TemplatesView({ templateList, itemsByTemplate, members, activeProject }: TemplatesViewProps) {
  const router = useRouter()
  const { currentUser } = useProjectMember()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [useModal, setUseModal] = useState<Template | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleConfirm(templateId: string, env: Environment, baseDate: string, assigneeByItemId: Record<string, string>) {
    if (!activeProject) return { ok: false as const, error: '활성 대시보드가 없습니다. 보드에서 새 대시보드를 먼저 만들어주세요.' }
    if (!currentUser) return { ok: false as const, error: '좌측에서 내 정보를 먼저 입력해주세요.' }
    const result = await createTasksFromTemplate(activeProject.id, { templateId, environment: env, baseDate, assigneeByItemId }, currentUser.id)
    if (result.ok) {
      setUseModal(null)
      router.refresh()
    }
    return result
  }

  function remove(template: Template) {
    if (!confirm(`'${template.name}' 템플릿을 삭제할까요?`)) return
    startTransition(async () => {
      await deleteTemplate(template.id)
      router.refresh()
    })
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[16px] font-semibold text-zinc-900 tracking-tight">템플릿</h1>
          {activeProject && (
            <span className="text-[12px] text-zinc-400 tracking-tight">
              생성 대상: <span className="text-zinc-600 font-medium">{activeProject.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeProject && <ProjectMembersButton />}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight shrink-0 whitespace-nowrap"
            onClick={() => setEditor({ mode: 'create' })}
          >
            <Plus size={13} />
            새 템플릿
          </button>
        </div>
      </div>

      <div className="max-w-xl">{activeProject && <MembershipAlert />}</div>

      <div className="space-y-3 max-w-xl">
        {templateList.length === 0 && (
          <div className="border border-dashed border-zinc-200 rounded p-10 text-center">
            <p className="text-[14px] text-zinc-500 tracking-tight">등록된 템플릿이 없습니다.</p>
            <p className="text-[13px] text-zinc-400 mt-1 tracking-tight">예약판매처럼 반복되는 세팅 묶음을 템플릿으로 만들어 두세요.</p>
          </div>
        )}

        {templateList.map(tpl => {
          const items = itemsByTemplate[tpl.id] ?? []
          return (
            <div
              key={tpl.id}
              className={`bg-white border rounded transition-colors ${expanded === tpl.id ? 'border-zinc-400' : 'border-zinc-200'}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}
                  >
                    <p className="text-[14px] font-medium text-zinc-900 tracking-tight">{tpl.name}</p>
                    {tpl.description && (
                      <p className="text-[13px] text-zinc-500 mt-0.5 tracking-tight">{tpl.description}</p>
                    )}
                    <p className="text-[12px] text-zinc-400 mt-1 tabular-nums tracking-tight">항목 {tpl.itemCount}개</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors"
                      onClick={() => setEditor({ mode: 'edit', template: tpl })}
                      aria-label="템플릿 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                      onClick={() => remove(tpl)}
                      aria-label="템플릿 삭제"
                      disabled={isPending}
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      className="px-3 py-1.5 text-[12px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-40"
                      onClick={() => setUseModal(tpl)}
                      disabled={!activeProject || items.length === 0 || !currentUser}
                      title={!activeProject ? '활성 대시보드가 없습니다' : !currentUser ? '좌측에서 내 정보를 먼저 입력해주세요' : undefined}
                    >
                      이 템플릿으로 생성
                    </button>
                  </div>
                </div>
              </div>

              {expanded === tpl.id && (
                <div className="px-4 pb-4 border-t border-zinc-100">
                  <p className="text-[12px] font-medium text-zinc-500 tracking-tight mt-3 mb-2">포함 항목</p>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-zinc-50 last:border-0">
                        <span className="text-[11px] text-zinc-400 tabular-nums tracking-tight w-4 shrink-0 mt-0.5">{i + 1}.</span>
                        <span className="text-[13px] text-zinc-700 tracking-tight flex-1">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {useModal && (
        <TemplateUseModal
          template={useModal}
          items={itemsByTemplate[useModal.id] ?? []}
          members={members}
          onClose={() => setUseModal(null)}
          onConfirm={(env, baseDate, assigneeByItemId) => handleConfirm(useModal.id, env, baseDate, assigneeByItemId)}
        />
      )}

      {editor && (
        <TemplateEditorModal
          template={editor.mode === 'edit' ? editor.template : undefined}
          initialItems={editor.mode === 'edit' ? itemsByTemplate[editor.template.id] : undefined}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
