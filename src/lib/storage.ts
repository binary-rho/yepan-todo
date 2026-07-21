import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const SCREENSHOT_BUCKET = 'screenshots'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1시간

function extensionFromType(contentType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[contentType] ?? 'png'
}

export async function uploadScreenshot(taskId: string, file: File): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const ext = extensionFromType(file.type)
  const path = `${taskId}/${crypto.randomUUID()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type || 'image/png', upsert: false })
  if (error) throw new Error(`스크린샷 업로드 실패: ${error.message}`)
  return path
}

export async function getScreenshotSignedUrl(path: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}
