// 로그인 우회 스위치. NEXT_PUBLIC_AUTH_BYPASS=1 이면 매직 링크 로그인을 건너뛰고
// 시드의 관리자 계정으로 바로 접근한다. (RLS 는 서비스 롤로 우회)
export const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === '1'

// 우회 모드에서 로그인한 것으로 취급할 사용자 id. 기본값은 seed.sql 의 관리자.
export const BYPASS_USER_ID =
  process.env.NEXT_PUBLIC_BYPASS_USER_ID ?? '11111111-1111-1111-1111-111111111111'
