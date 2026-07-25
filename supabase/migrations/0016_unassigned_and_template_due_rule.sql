-- ─── 1) 담당자 없이도 항목을 만든다 ─────────────────────────────────────────────
-- 실무에서는 "이 세팅이 필요하다" 는 것만 먼저 정해지고 누가 할지는 나중에 정해지는 경우가 많다.
-- 담당자를 비워둔 채 만들 수 있게 하고, 이 경우 알림은 사람 태그 없이 채널로만 나간다.
alter table public.tasks alter column assignee_id drop not null;

-- ─── 2) 템플릿 항목의 마감일 규칙 ───────────────────────────────────────────────
-- 템플릿은 여러 회차에 재사용되므로 날짜를 못박으면 매번 고쳐야 한다. 대신 "등록한 일정의
-- 시작일 ± N일" 로 저장해두면 적용 시점에 그 회차 일정으로 마감일이 계산된다.
--
-- 일정은 회차마다 다시 등록되면서 id 가 새로 발급되므로(saveSchedulePhases 가 전체 교체)
-- id 가 아니라 이름으로 참조한다. 같은 이름의 일정이 없으면 기준 마감일로 대체된다.
--
-- due_date 는 회차와 무관하게 날짜를 못박아 둘 때 쓰고(직접 선택),
-- 둘 다 없으면 적용 화면에서 입력한 기준 마감일을 그대로 쓴다.
alter table public.template_items
  add column due_phase_name  text,
  add column due_offset_days integer not null default 0,
  add column due_date        date;
