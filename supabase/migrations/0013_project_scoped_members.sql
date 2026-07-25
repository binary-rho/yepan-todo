-- Phase I: 멤버(담당자)는 이제 프로젝트(회차) 하나에만 속한다.
-- 회차마다 참여하는 팀 구성이 다를 수 있는데, 지금까지는 users 가 전역으로 공유돼
-- 다른 회차 사람이 섞여 보이거나 "현재 사용자" 선택지에 관계없는 사람까지 나오는 문제가 있었다.

-- 1) project_id 추가. 기존 멤버는 모두 "가장 최근 활성 회차"(없으면 가장 최근 회차) 소속으로 이관한다.
alter table public.users add column if not exists project_id uuid references public.projects (id) on delete cascade;

update public.users
   set project_id = (select id from public.projects where status = 'active' order by created_at desc limit 1)
 where project_id is null;

update public.users
   set project_id = (select id from public.projects order by created_at desc limit 1)
 where project_id is null;

alter table public.users alter column project_id set not null;
create index if not exists users_project_id_idx on public.users (project_id);

-- 2) 이메일 유일성 범위를 전역 -> 프로젝트 단위로 완화한다.
--    같은 사람이 여러 회차에 걸쳐 참여하면 회차마다 별도의 멤버 행으로 등록되므로 이메일이 중복될 수 있다.
alter table public.users drop constraint if exists users_email_key;
alter table public.users add constraint users_project_email_key unique (project_id, email);

-- 3) 템플릿은 여러 회차에 걸쳐 재사용되는데, 기본 담당자를 특정 회차의 멤버(id)로 고정하면
--    다른 회차에 적용할 때 그 멤버가 없어 깨진다. 실제 배정 없는 "힌트" 텍스트로 낮추고,
--    실제 담당자는 템플릿을 적용하는 시점에 그 회차의 멤버 중에서 고른다.
alter table public.template_items add column if not exists default_assignee_name text;
update public.template_items ti
   set default_assignee_name = u.name
  from public.users u
 where ti.default_assignee_id = u.id
   and ti.default_assignee_name is null;
alter table public.template_items drop column if exists default_assignee_id;

-- 4) 프로젝트 삭제(0011) 시 그 프로젝트의 멤버도 함께 삭제되는데(위 1번의 CASCADE),
--    notification_log.user_id 는 CASCADE 가 아니어서 알림 발송 기록이 하나라도 있으면
--    멤버 삭제가 FK 위반으로 막혀 결과적으로 프로젝트 삭제 전체가 실패한다. 로그이므로 CASCADE 로 바꾼다.
alter table public.notification_log drop constraint if exists notification_log_user_id_fkey;
alter table public.notification_log
  add constraint notification_log_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;
