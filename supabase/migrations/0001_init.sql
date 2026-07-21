-- BO 세팅 관리 도구 초기 스키마
-- types/index.ts 의 타입 정의와 1:1로 대응한다. (DB: snake_case)

create extension if not exists pgcrypto;

-- ─── Enums ────────────────────────────────────────────────────────────────────
create type task_status as enum ('todo', 'in_progress', 'review_requested', 'done', 'rejected');
create type environment as enum ('dev', 'stg', 'prd');
create type user_role as enum ('admin', 'assignee');

-- ─── Tables ─────────────────────────────────────────────────────────────────--
create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  name         text not null,
  role         user_role not null default 'assignee',
  messenger_id text,
  created_at   timestamptz not null default now()
);

create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  assignee_id    uuid not null references public.users (id),
  status         task_status not null default 'todo',
  environment    environment not null,
  due_date       date,
  is_blocking    boolean not null default false,
  confluence_url text,
  verify_url     text,
  verify_point   text,
  screenshot_url text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_status_idx on public.tasks (status);

create table public.task_history (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  from_status task_status,
  to_status   task_status not null,
  changed_by  uuid not null references public.users (id),
  reason      text,
  created_at  timestamptz not null default now()
);
create index task_history_task_id_idx on public.task_history (task_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.users (id),
  body       text not null,
  created_at timestamptz not null default now()
);
create index comments_task_id_idx on public.comments (task_id);

create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.template_items (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references public.templates (id) on delete cascade,
  title               text not null,
  description         text,
  environment         environment,
  is_blocking         boolean not null default false,
  confluence_url      text,
  verify_url          text,
  verify_point        text,
  default_assignee_id uuid references public.users (id)
);
create index template_items_template_id_idx on public.template_items (template_id);

create table public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks (id) on delete set null,
  user_id    uuid not null references public.users (id),
  kind       text not null,
  sent_at    timestamptz not null default now(),
  dedupe_key text not null unique
);

-- ─── updated_at 자동 갱신 ────────────────────────────────────────────────────--
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─── 권한 헬퍼 (RLS 재귀 방지를 위해 security definer) ─────────────────────────--
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────────--
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.comments enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.notification_log enable row level security;

-- users: 로그인 사용자는 프로필(이름 등) 조회 가능. 쓰기는 관리자만.
create policy users_select on public.users
  for select to authenticated using (true);
create policy users_admin_write on public.users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tasks: 관리자는 전체, 담당자는 본인 담당 항목만 조회/수정. 생성/삭제는 관리자만.
create policy tasks_select on public.tasks
  for select to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_admin() or assignee_id = auth.uid())
  with check (public.is_admin() or assignee_id = auth.uid());
create policy tasks_insert on public.tasks
  for insert to authenticated with check (public.is_admin());
create policy tasks_delete on public.tasks
  for delete to authenticated using (public.is_admin());

-- task_history: 해당 항목을 볼 수 있는 사람만 조회, 삽입 가능.
create policy task_history_select on public.task_history
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid())
  );
create policy task_history_insert on public.task_history
  for insert to authenticated with check (
    changed_by = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid())
    )
  );

-- comments: 해당 항목을 볼 수 있는 사람만 조회, 본인 명의로만 작성.
create policy comments_select on public.comments
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid())
  );
create policy comments_insert on public.comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.tasks t where t.id = task_id and t.assignee_id = auth.uid())
    )
  );

-- templates / template_items: 로그인 사용자 조회, 쓰기는 관리자만.
create policy templates_select on public.templates
  for select to authenticated using (true);
create policy templates_admin_write on public.templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy template_items_select on public.template_items
  for select to authenticated using (true);
create policy template_items_admin_write on public.template_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- notification_log: 일반 사용자 접근 불가. 서버(서비스 롤)만 접근한다(RLS 우회).
