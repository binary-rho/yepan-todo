-- Phase G: "운영자" 개념 제거
-- role(admin/assignee) 구분을 없앤다. 모든 담당자는 동등하며, 특정 한 명을
-- 고정된 "현재 사용자(운영자)"로 취급하지 않는다. 누가 작업했는지는 화면에서
-- 매번 선택한 담당자(actorId)를 그대로 changed_by/author_id 로 기록해 정한다.
alter table public.users drop column if exists role;
drop type if exists user_role;
