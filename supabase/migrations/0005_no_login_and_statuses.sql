-- Phase A: 로그인 제거 + 상태 단순화(할 일 / 완료 / 반려)
-- 이 파일은 0001~0004 를 이미 실행한 DB 에 이어서 실행한다.

-- 1) 상태 단순화: 진행중/완료요청 항목을 '할 일'로 이관한다.
--    (enum 값 자체는 과거 이력 표시를 위해 유지한다)
update public.tasks
   set status = 'todo'
 where status in ('in_progress', 'review_requested');

-- 2) 로그인 제거: users 를 auth.users 와 분리한다.
--    이제 users 는 "담당자/운영자 프로필" 목록일 뿐이며, 자유롭게 추가/수정한다.
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users alter column id set default gen_random_uuid();

-- 3) 단일 운영자 프로필 보장. 앱은 이 id 행 하나를 "현재 사용자"로 사용한다.
--    (기존 시드 관리자 id 를 그대로 재사용 — 없으면 기본값으로 생성)
insert into public.users (id, email, name, role)
values ('11111111-1111-1111-1111-111111111111', 'me@example.com', '홍길동', 'admin')
on conflict (id) do nothing;
