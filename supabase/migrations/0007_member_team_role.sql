-- Phase F: 멤버 역할(직군) 필드 추가
-- 로그인 제거 이후 users.role(admin/assignee)은 더 이상 권한 구분에 쓰이지 않는다.
-- 대신 담당자를 쉽게 구분하도록 직군 라벨(team_role)을 별도로 둔다. 기본값은 미정(null).
alter table public.users
  add column if not exists team_role text;

alter table public.users
  add constraint users_team_role_check
  check (team_role is null or team_role in ('사업', '기획', 'TPM', 'FE', 'BE'));
