# BO 세팅 관리 도구

특정 서비스의 BO(백오피스) 세팅 요청을 추적하고, 항목별 담당자에게 자동으로 알림을 보내는 사내 도구다.
FO는 BO에 값이 세팅되어야 동작하는 영역이 많고 항목별 담당자가 모두 다른데, 이 도구가 메신저로 한 명씩 태그해 독촉하던 과정을 대체한다.

> 사용 빈도는 연 3회 내외다. 기능을 늘리기보다 단순하고 확실하게 동작하는 것을 우선한다.
> 다음에 다시 열었을 때 이 README만 따라 하면 처음부터 세팅할 수 있도록 작성했다.

## 기술 스택

- Next.js 14 (App Router, Server Actions)
- Supabase (PostgreSQL, Storage)
- zod (입력 검증)
- Tailwind CSS v4
- Vercel (배포 + Cron)

## 화면

로그인이 없다. 진입 즉시 보드가 보이며, 좌측 내비의 "프로필 수정"에서 현재 사용자(이름/이메일)를 바꾼다.

- `/` 보드: 3개 상태(할 일 / 완료 / 반려) 칸반, 진척률, 필터, 항목 생성, 일정, 템플릿
- `/tasks/[id]` 항목 상세: 상태 전환, 코멘트, 이력, 스크린샷 첨부
- `/templates` 템플릿으로 항목 일괄 생성

---

## 1. 로컬 실행

### 사전 준비
- Node.js 18.18 이상 (권장: 20+)
- pnpm 9 이상 (`corepack enable` 또는 `npm i -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (로컬 DB용, 선택) 또는 Supabase 클라우드 프로젝트

### 절차
```bash
# 1) 의존성 설치
pnpm install

# 2) 환경 변수 파일 생성
cp .env.example .env.local
# .env.local 을 열어 아래 "3. 환경 변수" 값을 채운다.

# 3) 개발 서버 실행
pnpm dev
# http://localhost:3000
```

### 자주 쓰는 스크립트
```bash
pnpm dev        # 개발 서버
pnpm build      # 프로덕션 빌드
pnpm start      # 빌드 결과 실행
pnpm typecheck  # 타입 체크 (tsc --noEmit)
pnpm gen:types  # (로컬 Supabase 연결 시) DB 타입 재생성
```

> 이 프로젝트는 패키지 매니저로 **pnpm** 을 사용한다. Tailwind v4 네이티브 바이너리(`@tailwindcss/oxide`) 빌드를 위해 `package.json` 의 `pnpm.onlyBuiltDependencies` 에 허용 목록을 두었다.

---

## 2. Supabase 초기 세팅

### 방법 A. 로컬 개발 (Supabase CLI)
```bash
# Supabase 로컬 스택 시작 (Docker 필요)
supabase start

# 마이그레이션 + 시드 적용 (supabase/migrations + supabase/seed.sql)
supabase db reset
```
`supabase start` 출력의 `API URL`, `anon key`, `service_role key` 를 `.env.local` 에 넣는다.
로그인이 없으므로 모든 DB 접근은 `service_role` 키로 이뤄진다 → 이 키를 반드시 채워야 한다.

### 방법 B. 클라우드 프로젝트
1. https://supabase.com 에서 새 프로젝트를 만든다.
2. 설정 > API 에서 `Project URL`, `anon public`, `service_role` 키를 복사해 `.env.local`(및 Vercel 환경 변수)에 넣는다.
3. 마이그레이션 적용:
   - CLI: `supabase link --project-ref <ref>` 후 `supabase db push`
   - 또는 대시보드 SQL Editor 에서 `supabase/migrations/` 의 `0001_init.sql` → `0002_storage.sql` → `0003_app_settings.sql` → `0004_schedule.sql` → `0005_no_login_and_statuses.sql` → `0006_projects.sql` 을 순서대로 실행.
4. 샘플 데이터가 필요하면 SQL Editor 에서 `supabase/seed.sql` 을 실행한다. (운영에서는 생략 가능)
   - 로그인이 없으므로 별도 Auth 설정은 필요 없다. 앱은 `users` 의 운영자 프로필 행 하나를 "현재 사용자"로 사용한다(0005·seed 가 보장).

> 스키마는 `types/index.ts` 의 타입과 1:1로 대응한다. DB는 snake_case, 앱 코드는 camelCase 이며 변환은 `src/lib/db/mappers.ts` 가 담당한다.

---

## 3. 환경 변수

`.env.local`(로컬) 및 Vercel 프로젝트 환경 변수에 설정한다.

| 키 | 용도 | 노출 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 (RLS 적용) | 클라이언트 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키. **모든 DB 접근이 이 키(RLS 우회)로 이뤄진다** | **서버 전용, 노출 금지** |
| `NEXT_PUBLIC_SITE_URL` | 배포 절대 URL. 알림 링크에 사용 | 클라이언트 |
| `CRON_SECRET` | 크론 엔드포인트 인증 시크릿 | 서버 전용 |
| `NEXT_PUBLIC_PROFILE_USER_ID` | (선택) 현재 사용자로 쓸 `users` 프로필 id. 미설정 시 기본값 | 클라이언트 |
| `MS_GRAPH_TENANT_ID` / `MS_GRAPH_CLIENT_ID` / `MS_GRAPH_CLIENT_SECRET` / `MS_GRAPH_TEAM_ID` | (선택) 멤버 관리 "팀즈에서 가져오기" 버튼용 Microsoft Graph 연동. 4개 중 하나라도 없으면 버튼이 실패 메시지만 반환하고 나머지 기능은 정상 동작 | 서버 전용 |

> 메신저 웹훅 URL 은 환경 변수가 아니라 **관리자 보드 화면**에서 입력해 DB(`app_settings`)에 저장한다.

---

## 4. 프로필 / 담당자 관리

로그인이 없다. `public.users` 는 담당자 목록이자 운영자 프로필 목록이며, 이 중 한 행(`NEXT_PUBLIC_PROFILE_USER_ID`, 기본값 `1111…`)이 앱의 "현재 사용자"다.

- **현재 사용자(이름/이메일) 변경**: 좌측 내비 "프로필 수정"에서 바로 편집한다.
- **담당자 추가**(항목 배정 대상): SQL Editor 에서 users 행을 추가한다.
  ```sql
  insert into public.users (email, name, role)
  values ('someone@telecom.co.kr', '김담당', 'assignee');
  ```
  (`id` 는 자동 생성된다. `role` 컬럼은 남아 있으나 접근 제어에는 쓰이지 않는다.)

> 샘플 계정은 `supabase/seed.sql` 이 운영자 프로필 1명(`홍길동`)과 담당자 2명을 생성한다.

---

## 5. Supabase 무료 플랜 일시정지 재개

무료 플랜은 약 1주간 활동이 없으면 프로젝트가 일시정지될 수 있다.
- 재개: 대시보드에서 해당 프로젝트의 **Restore / Resume project** 버튼을 누른다. 수 분 내 복구된다.
- 예방: 크론(`/api/cron/notify`)이 하루 한 번 실행되며 실행 시 Supabase에 가벼운 쿼리를 날려 활동을 유지한다. 따라서 Vercel Cron 이 켜져 있으면 자동으로 일시정지를 예방한다.

---

## 6. Vercel 배포 및 Cron 설정

1. GitHub 저장소를 Vercel 에 임포트한다(프레임워크: Next.js 자동 감지).
2. Vercel > Settings > Environment Variables 에 위 "3. 환경 변수" 를 모두 등록한다.
   - `NEXT_PUBLIC_SITE_URL` 은 배포 도메인(`https://your-app.vercel.app`)으로 설정한다.
   - `CRON_SECRET` 은 임의의 긴 랜덤 문자열로 설정한다.
3. 배포 후 `SUPABASE_SERVICE_ROLE_KEY` 가 정확히 등록됐는지 확인한다(모든 DB 접근에 사용).
4. Cron:
   - `vercel.json` 에 하루 한 번(`0 0 * * *`) `/api/cron/notify` 를 호출하도록 정의되어 있다.
   - Vercel Cron 은 요청 시 `Authorization: Bearer <CRON_SECRET>` 헤더를 자동으로 붙인다. 엔드포인트는 이 값을 검증하고 불일치 시 401 을 반환한다.
   - 수동 테스트:
     ```bash
     curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/notify
     ```

---

## 7. 알림 동작

- **즉시 발송**: 항목 생성/담당자 배정(담당자에게), `rejected`(담당자에게, 사유 포함).
- **일괄 발송(크론, 하루 1회)**: 담당자당 한 건으로 합친 다이제스트(미완료 요약 + 오늘/2일 후 마감 + 마감 초과). 마감 초과는 관리자에게도 통지.
- 모든 메시지에 항목의 `/tasks/[id]` 절대 경로 링크가 포함된다.
- 웹훅 URL 은 **보드(`/`) 상단 "알림 웹훅 URL" 필드**에서 입력하며 `app_settings` 테이블에 저장된다(자주 바뀌는 값이라 화면에서 관리). **URL 이 설정되지 않으면 알림을 발송하지 않는다.** 웹훅 페이로드는 `{ text: string }` 이며, 스펙이 확정되면 `src/lib/notifications/transport.ts` 한 곳만 고치면 된다.
- Teams 웹훅은 채널 → **Workflows** → "Post to a channel when a webhook request is received" 템플릿으로 URL 을 발급받는다(구 Incoming Webhook 커넥터는 폐기됨).
- 중복 발송은 `notification_log.dedupe_key` 로 차단한다.

---

## 프로젝트 구조 요약

```
src/
  app/                 # App Router (login, /, board, templates, tasks/[id], auth/callback, api/cron/notify)
  components/          # 화면/공통/클라이언트 컴포넌트 (기존 마크업 보존)
  lib/
    supabase/          # 서버/브라우저/서비스롤 클라이언트, 미들웨어
    db/                # queries, mappers, database.types
    notifications/     # 전송부 인터페이스, 즉시/크론 알림
    actions.ts         # Server Actions (생성/수정/상태전환/코멘트/템플릿)
    auth.ts, profile.ts, transitions.ts, validation.ts, storage.ts, constants.ts, date.ts
  types/index.ts       # 정본 타입
supabase/
  migrations/          # 0001_init.sql, 0002_storage.sql
  seed.sql             # 샘플 데이터
middleware.ts          # 세션 갱신 + 라우트 보호
vercel.json            # Cron 정의
```
