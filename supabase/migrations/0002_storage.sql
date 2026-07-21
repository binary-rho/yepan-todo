-- 스크린샷 첨부용 비공개 스토리지 버킷.
-- 접근은 서버(서비스 롤)에서 발급한 서명 URL 로만 이루어진다. (공개 정책 없음)
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;
