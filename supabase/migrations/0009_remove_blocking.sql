-- "차단(blocking)" 개념 제거
-- 사용자가 의미를 이해하기 어렵고 실사용에서 불필요했다. 항목/템플릿 항목 모두에서 없앤다.
alter table public.tasks drop column if exists is_blocking;
alter table public.template_items drop column if exists is_blocking;
