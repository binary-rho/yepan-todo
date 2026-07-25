-- 대시보드(회차) 생성 시 선택적으로 설명을 남길 수 있게 한다. 보관함 목록에서 함께 보여준다.
alter table public.projects add column if not exists description text;
