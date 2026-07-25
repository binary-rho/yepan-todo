-- 보관함에서 대시보드(회차)를 완전히 삭제할 수 있게 한다.
-- tasks.project_id 는 기존에 ON DELETE 동작이 없어(NO ACTION) 프로젝트 삭제 시 FK 위반이 났다.
-- CASCADE 로 바꾸면 프로젝트 삭제 시 소속 tasks 가 함께 지워지고,
-- tasks 에 이미 걸린 CASCADE(comments, task_history) 와 SET NULL(notification_log) 이 연쇄적으로 정리한다.
alter table public.tasks drop constraint if exists tasks_project_id_fkey;
alter table public.tasks
  add constraint tasks_project_id_fkey
  foreign key (project_id) references public.projects (id) on delete cascade;
