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

로그인이 없다. 진입 즉시 보드가 보이며, 보드/템플릿/항목 상세 화면 상단에서 "현재 사용자"를 그 회차(대시보드)의 멤버 중 골라 쓴다(브라우저에 기억됨). 관리자/일반 등급 구분 없이 모든 멤버가 동등하다.

- `/` 보드: 3개 상태(할 일 / 완료 / 반려) 칸반, 진척률, 필터, 항목 생성, 일정, 템플릿, 현재 사용자/멤버 관리
- `/tasks/[id]` 항목 상세: 상태 전환, 코멘트, 이력, 스크린샷 첨부
- `/templates` 템플릿으로 항목 일괄 생성(적용 시 이 회차 멤버 중에서 항목별 담당자 선택)
- `/archive` 보관된 회차 목록(읽기 전용) 및 삭제

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
   - 또는 대시보드 SQL Editor 에서 `supabase/migrations/` 의 `0001_init.sql` 부터 번호 순서대로 마지막 파일까지 실행.
4. 샘플 데이터가 필요하면 SQL Editor 에서 `supabase/seed.sql` 을 실행한다. (운영에서는 생략 가능)
   - 로그인이 없으므로 별도 Auth 설정은 필요 없다. `users` 는 담당자 목록이며 회차(프로젝트) 하나에만 속한다. 화면에서 지금 보는 회차의 멤버 중 아무나 "현재 사용자"로 선택해 쓴다.

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
| `MS_GRAPH_TENANT_ID` / `MS_GRAPH_CLIENT_ID` / `MS_GRAPH_CLIENT_SECRET` / `MS_GRAPH_TEAM_ID` | (선택) 멤버 관리 "팀즈에서 가져오기" 버튼용 Microsoft Graph 연동. 4개 중 하나라도 없으면 버튼이 실패 메시지만 반환하고 나머지 기능은 정상 동작 | 서버 전용 |

> 메신저 웹훅 URL 은 환경 변수가 아니라 **관리자 보드 화면**에서 입력해 DB(`app_settings`)에 저장한다.

---

## 4. 담당자(멤버) 관리

로그인이 없고, 관리자/일반 등급 구분도 없다. **멤버는 회차(대시보드) 하나에만 속한다** — 회차마다 참여 팀 구성이 다를 수 있어 전역으로 공유하지 않는다. 같은 사람이 다음 회차에도 참여하면 그 회차에 다시 등록해야 한다(새 회차는 항상 멤버 0명으로 시작).

- **담당자 추가/수정/삭제**: 보드/템플릿/항목 상세 화면 상단 "멤버 관리"에서 지금 보고 있는 회차의 이름·이메일·직군(미정/사업/기획/TPM/FE/BE)을 관리한다. 이메일은 Teams 알림 @멘션 id 로도 쓰이므로 실제 조직 이메일을 넣는다.
- **현재 사용자**: 같은 헤더의 드롭다운에서 지금 회차의 멤버 중 "나"를 고른다(브라우저 로컬에 회차별로 기억, 실제 인증 아님). 아직 아무도 고르지 않은 새 브라우저는 실제 팀원이 아니라 플레이스홀더 기본 멤버(`홍길동`, 마이그레이션 0012)로 시작해 다른 사람 이름으로 오인 기록되는 걸 막는다.
- **Teams에서 가져오기**: 같은 화면의 버튼으로 Microsoft Graph 연동을 시도한다(환경변수 미설정 시 실패 메시지만 뜨고 나머지 기능엔 영향 없음).
- **템플릿과의 관계**: 템플릿은 여러 회차에 재사용되므로 항목의 "기본 담당자"는 실제 배정이 아니라 자유 텍스트 힌트다. 템플릿을 적용해 항목을 생성하는 시점에 지금 회차의 실제 멤버 중에서 항목별 담당자를 고른다.

> 샘플 데이터는 `supabase/seed.sql` 이 기본 대시보드에 담당자 3명(`홍길동`, `김민준`, `이서연`)을 생성한다.

---

## 4-1. 대시보드(회차) 생성 및 보관함

예판 회차마다 대시보드를 새로 만들고, 끝난 회차는 보관해 읽기 전용으로 남겨둔다.

- **새 대시보드**: 보드 상단 "새 대시보드" 버튼으로 이름(필수)과 설명(선택)을 입력해 생성한다. 설명은 나중에 보관함 목록에서 그 회차가 어떤 목적이었는지 구분하는 용도다. **활성 대시보드는 항상 하나뿐이어야 하므로 보관 여부는 선택할 수 없다** — 새로 만들면 기존에 활성 상태였던 대시보드는 예외 없이 자동으로 보관된다.
- **보관함**: 좌측 내비 "보관함" 메뉴에서 보관된 회차만 모아 이름·설명·보관일·항목 수를 확인할 수 있다. 항목을 클릭하면 해당 대시보드로 이동한다. "삭제" 버튼으로 완전히 지울 수 있으며(확인 필요), 소속 항목·코멘트·이력·메모·멤버가 함께 삭제되고 되돌릴 수 없다. 보관된 회차만 삭제할 수 있다(활성 회차 오삭제 방지).
- 보관된 회차는 보드/항목 상세 어디서나 완전한 읽기 전용이다(상태 변경·담당자 변경·항목 생성/수정·코멘트·알림 발송 모두 서버에서도 막는다).
- 우측 "메모/이슈 로그" 패널은 보관함과 별개다. 지금 보고 있는 **그 회차 하나**에 귀속된 기록이라 항상 보드 옆에 붙어 있다.

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
