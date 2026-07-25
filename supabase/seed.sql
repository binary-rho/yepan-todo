-- 샘플 시드 데이터: 운영자 프로필 1명 + 담당자 2명, tasks 5건, 템플릿 1건
-- 로그인은 제거됐다. users 는 담당자/운영자 프로필 목록이며 auth 와 무관하다.
-- (로컬: `supabase db reset` 시 자동 적용 / 운영: SQL 에디터에서 실행)

-- ─── 프로필 / 담당자 ──────────────────────────────────────────────────────────
-- id '1111…' 행이 앱이 사용하는 단일 운영자 프로필("현재 사용자")이다. 이름/이메일은 앱에서 수정 가능.
insert into public.users (id, email, name, role, messenger_id)
values
  ('11111111-1111-1111-1111-111111111111', 'me@example.com', '홍길동', 'admin', null),
  ('22222222-2222-2222-2222-222222222222', 'minjun.kim@telecom.co.kr', '김민준', 'assignee', null),
  ('33333333-3333-3333-3333-333333333333', 'seoyeon.lee@telecom.co.kr', '이서연', 'assignee', null)
on conflict (id) do nothing;

-- ─── Tasks (5건) ──────────────────────────────────────────────────────────────
insert into public.tasks (id, title, description, assignee_id, status, environment, due_date, is_blocking, confluence_url, verify_url, verify_point)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', '요금제 노출 순서 설정', 'PRD 메인 요금제 목록 노출 순서를 변경합니다.', '22222222-2222-2222-2222-222222222222', 'todo', 'prd', '2026-07-15', true, 'https://confluence.example.com/pages/1001', 'https://admin.prd.telecom.co.kr/plans/order', '요금제 목록에서 5G Ultimate 요금제가 1번 위치인지 확인'),
  ('aaaaaaa1-0000-0000-0000-000000000002', '가입 가능 연령 제한 값 등록', '청소년 요금제 최대 연령을 18세로 변경합니다.', '33333333-3333-3333-3333-333333333333', 'todo', 'stg', '2026-07-18', true, 'https://confluence.example.com/pages/1002', 'https://admin.stg.telecom.co.kr/plans/youth/age-limit', '최대 연령이 18세로 표시되는지 확인'),
  ('aaaaaaa1-0000-0000-0000-000000000003', '프로모션 배너 노출 기간 설정', '여름 특가 배너 노출 시작/종료일을 설정합니다.', '22222222-2222-2222-2222-222222222222', 'todo', 'dev', '2026-07-25', false, null, null, null),
  ('aaaaaaa1-0000-0000-0000-000000000004', '데이터 이월 정책 플래그 변경', '잔여 데이터 이월 기능 플래그를 활성화합니다.', '33333333-3333-3333-3333-333333333333', 'done', 'prd', null, false, 'https://confluence.example.com/pages/1013', 'https://admin.prd.telecom.co.kr/data/rollover-flag', '플래그 상태가 활성화(true)인지 확인'),
  ('aaaaaaa1-0000-0000-0000-000000000005', '5G 전용 혜택 대상 단말 목록 업데이트', '신규 5G 단말 3종을 대상 목록에 추가합니다.', '22222222-2222-2222-2222-222222222222', 'rejected', 'prd', '2026-08-15', false, 'https://confluence.example.com/pages/1017', null, null)
on conflict (id) do nothing;

-- 최소 이력 (rejected 사유 노출 확인용)
insert into public.task_history (task_id, from_status, to_status, changed_by, reason, created_at)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', null, 'todo', '11111111-1111-1111-1111-111111111111', null, '2026-07-01T09:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000001', 'todo', 'in_progress', '22222222-2222-2222-2222-222222222222', null, '2026-07-08T10:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000005', null, 'todo', '11111111-1111-1111-1111-111111111111', null, '2026-07-18T09:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000005', 'todo', 'in_progress', '22222222-2222-2222-2222-222222222222', null, '2026-07-20T10:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000005', 'in_progress', 'review_requested', '22222222-2222-2222-2222-222222222222', null, '2026-07-21T08:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000005', 'review_requested', 'rejected', '11111111-1111-1111-1111-111111111111', '대상 단말 목록 기준이 불명확합니다. 모델명과 출시일 기준을 명시 후 재요청 바랍니다.', '2026-07-21T09:00:00Z')
on conflict do nothing;

insert into public.comments (task_id, author_id, body, created_at)
values
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '요금제 순서 변경 시 캐시 갱신도 함께 진행해주세요.', '2026-07-09T10:00:00Z'),
  ('aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '확인했습니다. 오늘 오후 작업 완료 예정입니다.', '2026-07-09T11:30:00Z')
on conflict do nothing;

-- ─── 템플릿 (1건) ─────────────────────────────────────────────────────────────
insert into public.templates (id, name, description)
values ('bbbbbbb1-0000-0000-0000-000000000001', '신규 요금제 출시 세팅', '신규 요금제 출시 시 필요한 BO 세팅 항목 묶음입니다.')
on conflict (id) do nothing;

insert into public.template_items (template_id, title, description, environment, is_blocking, default_assignee_id)
values
  ('bbbbbbb1-0000-0000-0000-000000000001', '요금제 노출 순서 설정', null, 'prd', true, '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '가입 가능 연령 제한 등록', null, 'prd', true, '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '혜택 우선순위 설정', null, 'prd', false, '22222222-2222-2222-2222-222222222222'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '요금제 약관 버전 업데이트', null, 'prd', false, '33333333-3333-3333-3333-333333333333'),
  ('bbbbbbb1-0000-0000-0000-000000000001', '출시 일시 및 종료일 설정', null, 'prd', false, '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- ─── 일정 국면 (샘플) ─────────────────────────────────────────────────────────
insert into public.schedule_phases (name, start_date, end_date, sort_order)
values
  ('사전알림', '2026-07-08', '2026-07-27', 0),
  ('언팩', '2026-07-22', null, 1),
  ('사전예약', '2026-07-28', '2026-08-03', 2),
  ('사전개통', '2026-08-04', '2026-08-07', 3),
  ('출시', '2026-08-07', null, 4)
on conflict do nothing;
