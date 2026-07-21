'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { emailSchema } from '@/lib/validation'

export type ActionResult = { ok: true } | { ok: false; error: string }

function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

function sanitizeNext(next: string | undefined | null): string {
  // 오픈 리다이렉트 방지: 내부 경로만 허용한다.
  if (!next || !next.startsWith('/') || next.startsWith('//')) return ''
  return next
}

export async function requestLoginLink(email: string, next?: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const supabase = createSupabaseServerClient()
  const nextPath = sanitizeNext(next)
  const emailRedirectTo = `${getSiteUrl()}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      // 사전 등록(auth.users 존재)된 이메일만 링크를 받는다. 신규 계정 생성 금지.
      shouldCreateUser: false,
      emailRedirectTo,
    },
  })

  if (error) {
    return { ok: false, error: '등록되지 않은 이메일이거나 링크 발송에 실패했습니다. 관리자에게 문의해주세요.' }
  }
  return { ok: true }
}

export async function logout(): Promise<void> {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
