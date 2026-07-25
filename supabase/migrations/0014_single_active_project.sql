-- 활성 대시보드(회차)는 항상 하나여야 한다. "새 대시보드" 생성 시 보관 여부를 선택하게 뒀던 게
-- 원인이 되어 활성 상태인 회차가 여러 개 남는 경우가 생겼다(대시보드가 어느 회차를 "현재"로
-- 봐야 할지 모호해짐). 가장 최근에 만든 활성 회차만 남기고 나머지는 보관 처리해 정상화한다.
update public.projects
   set status = 'archived',
       archived_at = coalesce(archived_at, now())
 where status = 'active'
   and id <> (
     select id from public.projects where status = 'active' order by created_at desc limit 1
   );
