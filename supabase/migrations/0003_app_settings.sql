-- 앱 설정 저장용 key/value 테이블. (현재는 메신저 웹훅 URL 보관에 사용)
-- 값은 관리자가 화면에서 입력하며 자주 바뀔 수 있다.
create table public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- 조회/쓰기 모두 관리자만. 서버(서비스 롤)는 RLS 를 우회해 알림 전송 시 값을 읽는다.
create policy app_settings_admin_all on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
