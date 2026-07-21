# 인수 검증 보고서 (HANDOFF_REPORT)

Figma Make가 생성한 UI 산출물을 백엔드 연동 전에 전수 검증한 결과다.
검증 대상 커밋: `chore: Figma Make UI 산출물 baseline (Vite SPA)`

---

## 0. 요약

전반적으로 화면·타입·목 데이터 구성은 명세와 잘 일치한다. 단 **프레임워크가 명세와 근본적으로 다르다**.
이 한 가지가 가장 큰 명세 위반이며, 사용자 확인을 거쳐 Next.js(App Router)로 마이그레이션하기로 결정했다.

| 구분 | 건수 | 비고 |
| --- | --- | --- |
| 명세 위반 (수정 필요) | 1건(구조) + 정리 다수 | 프레임워크, 미사용 의존성/컴포넌트 |
| 명세 미달 (채워 넣음) | 3건 | 로그인/템플릿 생성/스크린샷 첨부 — 백엔드 단계에서 구현 |
| 취향 차이 (보고만) | 4건 | 코드 미변경 |

---

## 1. 명세와 일치했던 항목

### 타입 정의 (`src/types/index.ts`)
명세의 정본 타입과 **정확히 일치**했다. 디자인 도구가 흔히 훼손하는 지점이 모두 정상이었다.

- `TaskStatus = 'todo' | 'in_progress' | 'review_requested' | 'done' | 'rejected'` — enum 표기 정상 (`inProgress`/`in-progress` 아님)
- `Environment = 'dev' | 'stg' | 'prd'`, `UserRole = 'admin' | 'assignee'` — 정상
- `User`, `Task`, `TaskHistory`, `Comment` — 필드명(camelCase), nullable 여부까지 명세와 1:1 일치
  - `Task.description | dueDate | confluenceUrl | verifyUrl | verifyPoint | screenshotUrl` 모두 `string | null` 로 정상 선언됨
  - 불필요하게 필수로 승격되거나 인라인으로 흩어진 엔티티 타입 없음

### 데이터 위치
- 모든 엔티티 목 데이터(`users`, `tasks`, `taskHistories`, `comments`, `templates`, `templateItems`)가 `src/lib/mock-data.ts` **한 곳에 집중**되어 있었다. 다른 파일에 하드코딩된 엔티티 배열/객체는 없었다.
- `App.tsx`의 `STATUS_CONFIG`, `ENV_CONFIG`, `KANBAN_COLUMNS`, `TODAY` 는 엔티티 데이터가 아니라 표시용 상수/설정이다(위반 아님). 다만 재사용을 위해 마이그레이션 중 `src/lib/constants.ts` 로 이동한다.

### 화면과 상태 (모두 구현되어 있었음)
- `/login` + 메일 발송 후 안내 상태 ✅
- `/` 담당자 화면: 미완료 건수·마감 초과 건수, 마감 초과 상단 배치 및 시각 구분, 반려 사유 노출, 빈 상태 ✅
- `/board` 관리자 칸반: 5개 상태 컬럼 전부, 진척률·전체 건수·미완료 차단 건수, 환경·담당자·차단 필터, 항목 생성/템플릿 버튼 ✅
- `/tasks/[id]` 상세: **확인 URL 버튼 + 바로 아래 확인 포인트 텍스트 함께 존재** ✅, 상태별 액션 버튼 노출, 반려 사유 입력 필수, 코멘트 목록·입력창, 상태 변경 이력 타임라인, 개발용 역할 전환 토글 ✅
- `/templates` 목록 + 펼침 상세 ✅

### 공통 컴포넌트
`StatusBadge`, `EnvBadge`, `BlockingBadge`, `DueDateDisplay`, `AssigneeDisplay`, `TaskCard` 가 각각 독립 함수 컴포넌트로 정의되어 있었고 인라인 중복 구현은 없었다. (단 모두 `App.tsx` 한 파일 안에 있어, 마이그레이션 중 파일로 추출한다.)

---

## 2. 명세 위반으로 판정해 수정한 항목

### (위반 1) 프레임워크 불일치 — Next.js가 아니라 Vite SPA
명세는 App Router 경로(`/login`, `/`, `/board`, `/tasks/[id]`, `/templates`), Server Actions, 미들웨어 라우트 보호, 서버/클라이언트 컴포넌트 분리, Vercel Cron 라우트, 알림 딥링크(`/tasks/[id]`)를 전제한다. 그러나 실제 산출물은:

- **Vite + React SPA**였다. 라우팅이 없고, `App.tsx`(1369줄) 한 파일에서 `PageView` union + `useState` 로 화면을 전환했다. URL이 없어 알림 딥링크가 불가능하다.
- `react-router` 가 의존성에 있으나 실제로는 전혀 사용되지 않았다.
- 서버 런타임이 없어 Server Actions/미들웨어/RSC/Cron 라우트가 원천적으로 불가능했다.

→ **조치:** 사용자 확인 후 Next.js(App Router) 로 마이그레이션. 기존 JSX 마크업과 Tailwind 클래스는 그대로 보존하고, 라우트 페이지 분리 및 서버/클라이언트 컴포넌트 분리만 수행한다. (별도 커밋)

### (위반 2) 대량 미사용 의존성 / 미사용 UI 컴포넌트
- 실제 앱 코드(`App.tsx`)는 `lucide-react` 아이콘과 로컬 타입/목데이터만 import 한다. `src/app/components/ui/` 의 shadcn 컴포넌트 세트와 `figma/ImageWithFallback` 는 **화면에서 전혀 사용되지 않았다.**
- 이에 따라 `@mui/material`, `@mui/icons-material`, `@emotion/*`, `recharts`, `react-dnd`, `react-dnd-html5-backend`, `react-slick`, `react-responsive-masonry`, `embla-carousel-react`, `canvas-confetti`, `react-popper`, `@popperjs/core`, `motion`, `vaul`, `cmdk`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `next-themes`, `sonner`, 다수의 `@radix-ui/*` 등이 **모두 미사용**이었다.

→ **조치:** 명세에 없고 화면에서 쓰이지 않는 라이브러리와 UI 컴포넌트를 제거한다. shadcn/ui 는 실제 화면에서 사용되지 않으므로 유지 대상이 아니다. (필요 시 이후 단계에서 최소 컴포넌트만 재도입)

---

## 3. 명세 미달로 새로 채워 넣을 요소 (기존 디자인 언어 유지)

화면 골격은 있으나 동작이 자리표시자 상태다. 백엔드 단계에서 기존 마크업을 유지한 채 실제 동작을 붙인다.

1. **로그인**: "로그인 링크 전송" 버튼이 `sent=true` 로만 전환되는 목이다. + "개발용 빠른 로그인" 목록으로 사용자 객체를 직접 주입한다. → Supabase Auth 매직 링크로 교체.
2. **템플릿으로 항목 생성**: `TemplateUseModal` 의 `onConfirm` 이 모달만 닫는 no-op 이다. → 환경·기준 마감일 입력 후 실제 일괄 생성으로 구현.
3. **스크린샷 첨부**: 상세 화면의 "스크린샷 첨부" 가 저장되지 않는 단순 텍스트 입력(`screenshotNote`)이다. → Supabase Storage(비공개 버킷 + 서명 URL)로 구현.

---

## 4. 취향 차이로 판단해 손대지 않은 항목 (코드 미변경)

명세 위반/미달이 아니라 디자이너의 판단으로 보아 그대로 둔다.

1. **`Template` 타입과 `itemCount` 필드**: 명세의 정본 타입 블록에는 `Template` 이 없지만, DB 명세에는 `templates`/`template_items` 테이블이 존재하고 `/templates` 화면이 실제로 이 타입을 사용한다. 따라서 제거하지 않고 유지한다. `itemCount` 는 DB 컬럼이 아니라 `template_items` 개수에서 파생되는 값이므로, 매퍼에서 계산해 채운다.
2. **사이드바 폭(`w-44`), 색상(zinc 계열), 여백, 폰트 크기(11~16px)** 등 시각 토큰 — 확정된 디자인으로 간주.
3. **담당자 화면의 "진행 중" 구분 라벨**이 마감 초과 항목이 있을 때만 노출되는 조건부 표기 — 의도된 정보 위계로 판단.
4. **칸반 컬럼 폭(`w-60`), 카드 hover 색** 등 레이아웃 세부 — 그대로 유지.

---

## 5. 판단이 애매해 임의로 결정한 항목과 근거

1. **경로 매핑**: 명세의 `/` 는 담당자 화면, `/board` 는 관리자 칸반이다. 기존 `PageView`('assignee'/'board')를 각각 `/`, `/board` 로 매핑한다.
2. **`src/` 디렉터리 유지**: 기존 코드가 `src/` 기준이라 Next.js도 `src/app` 구조로 두고 `@/*` alias 를 유지한다. 명세의 `lib/db/...`, `types/index.ts` 는 `src/lib/db/...`, `src/types/index.ts` 로 해석한다. (`supabase/` 는 루트)
3. **Next.js 14 + React 18 채택**: 기존 `peerDependencies` 가 React 18.3.1 이고 남길 최소 UI 요소들의 호환을 고려해 Next 14(App Router, Server Actions 안정판)를 선택. 근거는 `DECISIONS.md` 에 상세 기록.
4. **`changedBy` 표시**: 목 데이터는 이력의 `changedBy` 에 사람 이름 문자열을 넣었으나, DB 스키마에서는 `changed_by` 가 user id(uuid) 다. 매퍼/조회에서 user 를 join 해 이름으로 표시하도록 처리한다(화면 표기 보존).
