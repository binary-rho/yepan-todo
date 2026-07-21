import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/db/database.types'

// app_settings 테이블에 보관하는 설정 키 모음.
export const WEBHOOK_SETTING_KEY = 'messenger_webhook_url'

type DbClient = SupabaseClient<Database>

export async function readSetting(client: DbClient, key: string): Promise<string | null> {
  const { data } = await client.from('app_settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

export async function writeSetting(
  client: DbClient,
  key: string,
  value: string | null,
): Promise<{ ok: boolean }> {
  const { error } = await client
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  return { ok: !error }
}
