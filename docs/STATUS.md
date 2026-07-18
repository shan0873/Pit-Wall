# Pit-Wall 프로젝트 상태

> 새 세션에서 이 프로젝트를 이어받을 때 이 파일을 먼저 읽을 것.
> 작업 세션을 마칠 때마다 "현재 상태"와 "작업 이력"을 업데이트한다.

## 현재 상태 (2026-07-18 기준)

**단계: 앱 전환 + 소셜 로그인 구현 완료, 실기기 QA 진행 중 (스토어 제출 전)**

동작하는 것:
- 웹 버전 배포 중 (https://shan0873.github.io/Pit-Wall/), main push 시 자동 배포
- iOS 실기기(개인 Apple ID 서명, "MARS iPhone")에 설치되어 로그인 화면·메인 화면 정상 동작
- Android 에뮬레이터(AVD `pitwall_test`)에서 정상 동작 확인
- 구글 로그인: 실기기에서 로그인 진행 확인됨 (아래 미해결 항목 참고)
- 로그인 취소 후 버튼 복구, 노치 safe-area 등 실기기 발견 버그 수정 완료

미해결 / 확인 필요:
- [ ] **구글 로그인 성공 후 localhost로 리다이렉트되는 문제** — Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs에 `pitwall://auth-callback` 등록 여부 확인 필요 (사용자 확인 대기 중)
- [ ] **카카오 로그인 KOE205 에러** — 카카오 개발자 콘솔 → 카카오 로그인 → 동의항목에서 "카카오계정(이메일)"을 선택/필수 동의로 설정 필요 (사용자 진행 대기 중)
- [ ] 실기기 QA 전체 통과 (구글/카카오 로그인 완주, 로그아웃→재로그인, 앱 재실행 시 세션 유지)

다음 할 일 (순서대로):
1. 위 미해결 항목 2건 해결 후 실기기 QA 완료 (계획 문서 Task 11)
2. 앱 아이콘/스플래시 준비 — 1024x1024 로고 이미지 필요, `npx @capacitor/assets generate` 사용 (Task 10 잔여분)
3. 스토어 제출 (Task 12): Apple Developer Program($99/년)·Play Console($25) 가입 → TestFlight/내부테스트 → 심사 제출
   - 제출 직전 Sign in with Apple 추가 여부 판단 (Apple 가이드라인 4.8 반려 리스크, 스펙 문서 참고)

## 프로젝트 목적

F1 팬용 일정·순위 서비스. MVP(F-01~F-05)는 KST 일정 표시, 카운트다운, 순위, 브라우저 알림.
장기 로드맵(P2): 굿즈 구매대행, 커뮤니티 게시판, 실시간 채팅 — Supabase DB를 이 용도로 재사용 예정.
현재 목표: 앱스토어/플레이스토어 출시 (필수 소셜 로그인 게이트 포함).

## 관련 문서

- 아키텍처·개발 명령어·주의사항: `/CLAUDE.md`
- 앱 전환+로그인 설계 스펙: `docs/superpowers/specs/2026-07-10-app-social-login-design.md`
- 구현 계획(12개 태스크, 체크박스): `docs/superpowers/plans/2026-07-10-app-social-login.md`
- 일정 그룹핑 설계(완료된 과거 작업): `docs/superpowers/specs/2026-07-04-schedule-grouping-design.md`

## 외부 서비스 설정 현황

| 서비스 | 상태 |
|---|---|
| Supabase 프로젝트 (`xjryroyfxpasuxumtbnf`) | 생성 완료, Google/Kakao provider 활성화 완료 |
| Supabase Redirect URLs (`pitwall://auth-callback`) | **확인 필요** (localhost 리다이렉트 문제의 유력 원인) |
| Google Cloud OAuth 클라이언트 | 등록 완료 |
| Kakao Developers 앱 | 등록 완료, **동의항목(이메일) 설정 필요** |
| GitHub Actions Variables (VITE_SUPABASE_*) | 등록 완료 |
| Apple Developer Program / Play Console | 미가입 (Task 12에서) |
| 로컬 `.env.local` | 있음 (gitignore, 없으면 빈 화면 크래시) |

## 작업 이력

### 2026-07-18 (3차) — 웹 배포 장애 발견·복구
- **웹 배포가 Vite 전환 이후 줄곧 빈 화면이었음을 발견** (HTTP 200만 확인하고 브라우저 검증을 안 했었음). 원인 2개가 겹침:
  1. Vite 기본 base(`/`)가 GitHub Pages 하위경로(`/Pit-Wall/`)와 충돌 → 자산 404. `base: './'`로 수정 (`9aa0278`)
  2. CI 빌드에 Supabase 환경변수 미포함 → `createClient()` 크래시. GitHub에 등록한 값이 Actions Variables/Secrets 어느 경로로도 안 읽혀서, 공개 설계 값인 anon key를 워크플로우에 기본값으로 인라인 (`9c40a3e`) + 번들에 프로젝트 ref 포함 여부를 검사하는 빌드 가드 추가
- 교훈: **배포 검증은 반드시 브라우저로 실제 로드까지.** curl 200은 검증이 아님
- 라이브 확인 완료: 게스트 모드로 일정/카운트다운/순위 정상 표시

### 2026-07-18 (2차)
- 수익화 전략 브레인스토밍: 앱=유입 도구, 수익=원정 직관 제휴·굿즈 공동구매 중심. 첫 검증 실험으로 DC F1 갤러리에 웹 링크 공유 결정
- **웹 게스트 모드** 구현 (`0c4428a`): 웹 브라우저는 로그인 없이 바로 일정/순위 표시, 네이티브 앱은 필수 로그인 유지 (`Capacitor.isNativePlatform()` 분기)
- **방문 측정** 추가: 웹 로드 시 Supabase `page_views` 테이블에 `{source(?src= 파라미터), platform}` 기록 (fire-and-forget, 실패 무시)
  - [ ] **Supabase SQL Editor에서 `page_views` 테이블 생성 필요** (사용자, SQL은 아래 참고) — 생성 전까지 기록 안 되지만 앱 동작엔 지장 없음
- 커뮤니티 공유 링크는 `?src=` 파라미터로 유입처 구분 (예: `?src=dcgall`)

```sql
-- Supabase SQL Editor에서 1회 실행
create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text,
  platform text
);
alter table public.page_views enable row level security;
create policy "anon can insert" on public.page_views
  for insert to anon with check (true);
```

### 2026-07-18
- 실기기(iPhone 17 Pro) QA에서 발견된 버그 2건 수정:
  - 로그인 취소 후 화면 멈춤 → iOS는 `appStateChange`가 안 터지므로 `browserFinished` 리스너 추가 (`548b00e`)
  - 헤더가 노치에 가려 로그아웃 버튼 못 누름 → `viewport-fit=cover` + safe-area 패딩 (`0daf809`)
- 실기기에서 수정 반영 확인 완료
- CLAUDE.md, docs/STATUS.md 작성 (프로젝트 문서화)

### 2026-07-17
- 구현 계획 12개 태스크 중 코드 태스크 전체 완료 (서브에이전트 구동 방식, 태스크별 스펙/품질 리뷰):
  - Vite 전환(`608a7c1`), Capacitor iOS/Android 스캐폴딩(`dd7392e`), Supabase auth 클라이언트(`e62cd2f`), 로그인 화면(`0af9504`), 로그인 게이트 라우팅(`32c17d0`), 딥링크 네이티브 등록(`4ebea8d`), 로그인 에러 처리(`24365d5`), CI를 Vite 빌드로 전환(`b0b447c`)
  - 전체 브랜치 리뷰에서 발견된 에러 처리 공백 보강(`a1abdb0`): getSession 가드, 딥링크 콜백 try/catch, SIGNED_OUT 시 reload, `.env.local.example` 추가
- `feature/app-social-login` 브랜치를 main에 병합, GitHub Pages 배포 확인
- Supabase 프로젝트·구글/카카오 OAuth 등록 (사용자), GitHub Actions Variables 등록 (사용자)
- iOS 시뮬레이터·Android 에뮬레이터 빌드/실행 확인, Android SDK cmdline-tools·AVD 셋업
- 교훈: main 체크아웃에 `.env.local`이 없어 첫 iOS 빌드가 빈 화면 — 환경변수 누락 시 증상으로 기록

### 2026-07-10
- 앱 전환 + 카카오/구글 로그인 설계 스펙·구현 계획 작성 (`bb9bce9`, `1db1e63`)
- 저장소를 `~/projects/Pit-Wall`로 클론, gh CLI 인증 설정

### 2026-07-04 이전
- 초기 프로토타입: 단일 index.html (KST 일정/카운트다운/순위/알림)
- 시즌 일정을 진행중/예정/완료로 그룹핑 (`35c89e7`, `efac0d7`)
- GitHub Pages 배포 워크플로우 구성 (`3096f7a`)
