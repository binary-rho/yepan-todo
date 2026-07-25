-- Phase C: 프로젝트(예판 회차) 단위 대시보드 + 프로젝트 메모(이슈 로그)
-- 회차마다 새 대시보드를 열고, 완료된 회차는 보관(읽기 전용)한다.

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
create index projects_status_idx on public.projects (status);

-- 기존 항목을 담을 기본 회차를 만들고 모든 tasks 를 연결한다.
alter table public.tasks add column project_id uuid references public.projects (id);

insert into public.projects (id, name, status)
values ('cccccccc-0000-0000-0000-000000000001', '기본 대시보드', 'active')
on conflict (id) do nothing;

update public.tasks
   set project_id = 'cccccccc-0000-0000-0000-000000000001'
 where project_id is null;

alter table public.tasks alter column project_id set not null;
create index tasks_project_id_idx on public.tasks (project_id);

-- 프로젝트별 자유 메모/이슈 로그 (오른쪽 패널).
-- 예) "36개월 할부 결제 오류 — 월요일부터 열리도록 토스와 협의됨(사업 미공유)"
create table public.project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  body       text not null,
  author_id  uuid references public.users (id),
  created_at timestamptz not null default now()
);
create index project_notes_project_id_idx on public.project_notes (project_id);

-- 로그인이 없어 모든 접근이 서비스 롤(RLS 우회)로 이뤄진다. RLS 만 켜 두고 정책은 두지 않는다.
alter table public.projects enable row level security;
alter table public.project_notes enable row level security;
