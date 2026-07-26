-- 대시보드(회차) 삭제, 멤버 삭제가 FK 위반으로 막히던 문제를 고친다.
--
-- 0013 에서 users.project_id 를 ON DELETE CASCADE 로 걸어, 회차를 지우면 그 소속 멤버도
-- 함께 지워지도록 했다. 그런데 tasks.assignee_id / task_history.changed_by / comments.author_id /
-- project_notes.author_id 는 여전히 users 를 ON DELETE 동작 없이(기본 NO ACTION) 참조하고 있었다.
-- 그래서 회차 삭제 시 "회차 -> 멤버" 캐스케이드와 "회차 -> 항목 -> 이력/댓글" 캐스케이드가 동시에
-- 진행되는데, 이력/댓글이 채 지워지기 전에 멤버 삭제가 먼저 시도되면 FK 위반으로 전체가 실패했다.
-- (0013 의 4번 항목에서 notification_log.user_id 에 대해 이미 같은 이유로 CASCADE 로 바꿔둔 적이 있다.)
--
-- "누가 했는지" 는 화면에서 이미 못 찾으면 "알 수 없음"/"??" 로 대체해서 보여주고 있으므로(예:
-- mapProjectNote, TaskDetailView 의 코멘트 작성자 표시), 멤버가 지워져도 항목/이력/댓글 자체는
-- 남기고 참조만 비우는 SET NULL 이 적절하다.

alter table public.tasks
  drop constraint if exists tasks_assignee_id_fkey;
alter table public.tasks
  add constraint tasks_assignee_id_fkey
  foreign key (assignee_id) references public.users (id) on delete set null;

alter table public.task_history
  alter column changed_by drop not null;
alter table public.task_history
  drop constraint if exists task_history_changed_by_fkey;
alter table public.task_history
  add constraint task_history_changed_by_fkey
  foreign key (changed_by) references public.users (id) on delete set null;

alter table public.comments
  alter column author_id drop not null;
alter table public.comments
  drop constraint if exists comments_author_id_fkey;
alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references public.users (id) on delete set null;

alter table public.project_notes
  drop constraint if exists project_notes_author_id_fkey;
alter table public.project_notes
  add constraint project_notes_author_id_fkey
  foreign key (author_id) references public.users (id) on delete set null;
