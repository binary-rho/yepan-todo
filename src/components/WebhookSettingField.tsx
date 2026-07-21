'use client'

import { useState } from 'react'
import { Check, Bell } from 'lucide-react'
import { updateWebhookUrl } from '@/lib/actions'

interface WebhookSettingFieldProps {
  initialUrl: string | null
}

type SaveState = { status: 'idle' } | { status: 'saved' } | { status: 'error'; message: string }

export function WebhookSettingField({ initialUrl }: WebhookSettingFieldProps) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' })

  async function handleSave() {
    setSaving(true)
    setSaveState({ status: 'idle' })
    const result = await updateWebhookUrl(url)
    setSaving(false)
    if (result.ok) {
      setSaveState({ status: 'saved' })
    } else {
      setSaveState({ status: 'error', message: result.error })
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded p-3 mb-4">
      <div className="flex items-center gap-2">
        <Bell size={13} className="text-zinc-400 shrink-0" />
        <span className="text-[12px] text-zinc-500 tracking-tight shrink-0">알림 웹훅 URL</span>
        <input
          type="url"
          value={url}
          onChange={e => {
            setUrl(e.target.value)
            setSaveState({ status: 'idle' })
          }}
          placeholder="https://... (비우면 콘솔 출력으로 대체)"
          className="flex-1 min-w-0 px-2 py-1 text-[12px] border border-zinc-200 rounded text-zinc-700 bg-white outline-none focus:border-zinc-400 tracking-tight"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1 text-[12px] bg-zinc-900 text-white rounded hover:bg-zinc-700 transition-colors tracking-tight disabled:opacity-50 shrink-0"
        >
          {saveState.status === 'saved' ? <Check size={12} /> : null}
          {saving ? '저장 중' : '저장'}
        </button>
      </div>
      {saveState.status === 'error' && (
        <p className="mt-1.5 text-[12px] text-red-600 tracking-tight">{saveState.message}</p>
      )}
      {saveState.status === 'saved' && (
        <p className="mt-1.5 text-[12px] text-emerald-600 tracking-tight">저장되었습니다.</p>
      )}
    </div>
  )
}
