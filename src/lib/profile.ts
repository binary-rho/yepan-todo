// 로그인 없이 동작하는 단일 운영자 프로필.
// users 테이블의 이 id 행 하나를 "나(운영자)"로 간주하며, 이름/이메일은 앱에서 수정한다.
// 항목 이력(changed_by)·코멘트(author_id)의 작성자로도 이 id 를 사용한다.
export const PROFILE_USER_ID =
  process.env.NEXT_PUBLIC_PROFILE_USER_ID ?? '11111111-1111-1111-1111-111111111111'

export const DEFAULT_PROFILE_NAME = '홍길동'
export const DEFAULT_PROFILE_EMAIL = 'me@example.com'
