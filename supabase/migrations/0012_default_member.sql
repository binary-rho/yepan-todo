-- 로그인이 없어 브라우저가 "현재 사용자"를 아직 고르지 않았을 때 실제 팀원 중 아무나로
-- 오인 귀속(누가 한 것도 아닌데 특정 팀원 이름으로 기록됨)되는 걸 막기 위해
-- 이름이 명확히 플레이스홀더인 기본 멤버를 보장한다. (id 는 앱 코드의 DEFAULT_MEMBER_ID 와 동일해야 한다)
insert into public.users (id, email, name)
values ('11111111-1111-1111-1111-111111111111', 'default-user@example.com', '홍길동')
on conflict (id) do nothing;
