-- 출시 국면(일정) 저장. 항목 생성 시 국면을 고르면 그 시작일이 마감일로 자동 입력된다.
-- 예) 사전알림 7/8~7/27, 언팩 7/22, 사전예약 7/28~8/3, 사전개통 8/4~8/7, 출시 8/7
create table public.schedule_phases (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_date date not null,
  end_date   date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index schedule_phases_sort_order_idx on public.schedule_phases (sort_order);

alter table public.schedule_phases enable row level security;

-- 조회는 로그인 사용자 전체, 편집은 관리자만. 서버(서비스 롤)는 RLS 우회.
create policy schedule_phases_select on public.schedule_phases
  for select to authenticated using (true);
create policy schedule_phases_admin_write on public.schedule_phases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
