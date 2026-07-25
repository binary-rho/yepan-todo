-- 실사용 환경은 STG / PROD 두 개뿐이다. DEV 는 쓰지 않으므로 없애고,
-- 'prd' 표기도 실제로 부르는 이름인 'prod' 로 맞춘다.
--
-- postgres enum 은 값 삭제(drop value)가 불가능하므로 새 타입을 만들어 컬럼을 갈아끼운다.
-- environment 컬럼에는 default 나 인덱스가 없어 타입 교체만으로 충분하다.

-- 남아 있는 dev 항목은 지우지 않고 stg 로 옮긴다.
update public.tasks set environment = 'stg' where environment = 'dev';
update public.template_items set environment = 'stg' where environment = 'dev';

create type environment_next as enum ('stg', 'prod');

alter table public.tasks
  alter column environment type environment_next
  using (case environment::text when 'prd' then 'prod' else environment::text end)::environment_next;

alter table public.template_items
  alter column environment type environment_next
  using (case environment::text when 'prd' then 'prod' else environment::text end)::environment_next;

drop type environment;
alter type environment_next rename to environment;
