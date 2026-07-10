# 앱 패키징 + 카카오/구글 로그인 (스토어 출시)

## 배경

현재 Pit-Wall은 백엔드/서버 없이 GitHub Pages에서 서빙되는 단일 `index.html`(HTML/CSS/vanilla JS)이다. 이 상태를 앱스토어·플레이스토어에 출시 가능한 앱으로 전환하고, 앱 진입 시 카카오/구글 소셜 로그인을 필수로 거치도록 만든다.

## 목표

- 기존 웹 코드를 최대한 재사용해 **가장 빠르고 쉬운 경로**로 iOS/Android 스토어에 출시한다.
- 앱 진입 시 **필수 로그인 화면**(구글/카카오)을 거쳐야 메인 화면(일정/순위)에 진입할 수 있다.
- 웹 버전(GitHub Pages)도 계속 유지한다 — 앱은 같은 코드베이스에서 파생된다.

## 범위

**이번 스펙에 포함 (In scope):**
- Capacitor로 기존 웹앱을 iOS/Android 네이티브 셸로 패키징
- Supabase Auth로 구글 + 카카오 OAuth 로그인 (Capacitor 딥링크 콜백 방식)
- 로그인 필수 게이트 (미로그인 시 메인 화면 접근 불가)
- 로그아웃 기능
- Vite 기반으로 프로젝트 구조 전환 (빌드 도구 도입)
- GitHub Pages 배포 워크플로우를 Vite 빌드 결과물 배포로 조정

**이번 스펙에서 제외 (Out of scope, 추후 로드맵):**
- 로그인 계정에 프로필/즐겨찾기/알림설정 등 데이터 저장 (P2)
- 네이티브 푸시 알림 (현재 브라우저 Notification API + setTimeout 방식 유지, P2)
- Apple Sign-In 추가 여부 — **스토어 제출 직전**에 판단 (아래 "리스크" 참고)
- 기존 일정/순위/카운트다운 로직 자체의 기능 변경 (그대로 이관만 함)
- 자동화 테스트 도입 (프로젝트에 테스트 도구가 없고, 수동 QA로 대체)

## 전체 아키텍처

```
[Pit-Wall 앱 (iOS/Android)]
  └─ Capacitor 셸 (WebView)
       └─ 웹 프론트엔드 (Vite 기반으로 전환)
            ├─ 로그인 화면 (신규)
            │    └─ Supabase Auth SDK → 구글/카카오 OAuth
            │         └─ 시스템 브라우저(Capacitor Browser 플러그인)로 열림
            │              └─ 콜백을 커스텀 URL 스킴(딥링크)으로 앱에 복귀
            └─ 기존 일정/순위 화면 (로그인 후 진입)
```

**핵심 결정사항:**
- 단일 `index.html` → **Vite 기반 프로젝트로 전환**. Supabase SDK, Capacitor 패키지를 npm으로 관리하고, 로그인/메인 화면을 분리하기 위한 최소 모듈 구조가 필요하기 때문 (완전한 프레임워크 도입은 아님).
- 자체 백엔드 서버 코드는 작성하지 않음 — Supabase가 인증(OAuth 토큰 교환, 세션 관리)을 관리형으로 처리.
- **제약**: 구글은 앱 내장 WebView에서의 OAuth 로그인을 차단하므로, 로그인은 반드시 **시스템 브라우저**(Capacitor `Browser` 플러그인)에서 열리고 커스텀 URL 스킴(`pitwall://auth-callback`)으로 앱에 복귀해야 한다.
- Supabase를 선택한 이유: 구글 + 카카오 OAuth를 둘 다 관리형으로 지원하는 몇 안 되는 옵션 (Firebase는 카카오 기본 미지원, 커스텀 OIDC 설정 필요). Postgres DB도 함께 제공되어 향후 로드맵(커뮤니티 게시판, 굿즈 구매대행)에도 재사용 가능.

## 로그인 플로우

```
1. 앱 실행
2. Supabase 세션 확인
   ├─ 세션 있음 → 바로 메인 화면(일정/순위)으로 진입
   └─ 세션 없음 → 로그인 화면 표시
3. 로그인 화면: "구글로 계속하기" / "카카오로 계속하기" 버튼
4. 버튼 클릭 → Capacitor Browser 플러그인이 시스템 브라우저를 열고
   Supabase가 생성한 OAuth URL로 이동 (구글/카카오 로그인 페이지)
5. 사용자가 로그인 완료
6. 구글/카카오 → Supabase → 앱의 커스텀 URL 스킴(pitwall://auth-callback)으로 리다이렉트
7. Capacitor의 App 플러그인이 딥링크를 캐치 → 콜백 URL에서 토큰 추출 → Supabase SDK에 세션 설정
8. 시스템 브라우저 닫힘 → 메인 화면으로 전환, 세션은 기기에 안전하게 저장(다음 실행 시 자동 로그인)
```

로그아웃 버튼은 메인 화면 헤더에 추가한다.

**사전 준비 필요 (개발 착수 전 외부 계정/설정 발급):**
- Google Cloud Console: OAuth 클라이언트 ID 발급 (Web 타입, Supabase 콜백 URL 등록)
- Kakao Developers: 카카오 앱 등록, REST API 키 + Redirect URI 등록, 카카오 로그인 활성화
- Supabase 프로젝트 신규 생성, Authentication → Providers에서 Google/Kakao 활성화 후 클라이언트 ID/Secret 입력

## 프로젝트 구조 변화

```
Pit-Wall/
├── index.html              (Vite 진입점으로 유지, 내용은 앱 셸로 축소)
├── src/
│   ├── main.js              (라우팅: 로그인 화면 ↔ 메인 화면 전환)
│   ├── auth.js               (Supabase 클라이언트 초기화, 로그인/로그아웃/딥링크 처리)
│   ├── login-view.js         (로그인 화면 UI)
│   └── app-view.js            (기존 index.html의 카운트다운/일정/순위 로직 이관)
├── ios/                      (Capacitor가 생성하는 Xcode 프로젝트)
├── android/                  (Capacitor가 생성하는 Android Studio 프로젝트)
├── capacitor.config.json
├── package.json
├── vite.config.js
└── .env.local                (Supabase URL/anon key — .gitignore 처리)
```

- 기존 카운트다운/일정/순위 로직(현재 `index.html` 내 약 400줄)은 거의 그대로 `app-view.js`로 이관하고, 로직 자체는 수정하지 않는다.
- GitHub Pages 배포(`.github/workflows/pages.yml`)는 유지하되, Vite 빌드 결과물(`dist/`)을 배포하도록 조정한다.
- Supabase anon key는 클라이언트 노출에 안전한 키지만, `.env.local`로 분리해 다른 민감정보와 섞이지 않게 관리한다.

## 스토어 출시 단계

```
1. 개발자 계정 준비
   ├─ Apple Developer Program 가입 ($99/년)
   └─ Google Play Console 계정 ($25 1회)
2. Capacitor 네이티브 프로젝트 생성 (npx cap add ios / android)
3. 앱 아이콘, 스플래시 화면, 앱 이름/번들ID 설정
4. iOS: Xcode 서명/빌드 → TestFlight 내부 테스트 → App Store 심사 제출
5. Android: Android Studio 서명된 AAB 빌드 → Play Console 내부 테스트 → 프로덕션 심사 제출
6. 딥링크(pitwall://auth-callback)를 양쪽 플랫폼 설정 파일에 등록
   (iOS: Info.plist URL Scheme / Android: AndroidManifest intent-filter)
```

**리스크 — Apple Sign-In:**
소셜 로그인(구글/카카오)만 제공하고 애플 로그인을 빼면, Apple 심사 가이드라인 4.8에 따라 반려될 수 있다. 이번 스펙에는 애플 로그인 구현을 포함하지 않지만, 아키텍처상 나중에 추가해도 문제없다 (동일한 Supabase 멀티 프로바이더 패턴 재사용, 버튼 추가 + Supabase에서 provider 활성화 + Xcode capability 추가 정도로 끝남). **판단 시점은 "제출 후 반려되고 나서"가 아니라 "제출 직전"** — 반려 후 대응하면 재심사 사이클이 한 번 더 돌아 며칠이 추가로 소요된다.

각 플랫폼 심사/승인까지 최소 1~3일 소요되며, 이는 개발 범위 밖의 외부 대기시간이다.

## 에러 처리

- 사용자가 시스템 브라우저에서 로그인 취소/뒤로가기 → 로그인 화면으로 복귀, 에러 없이 조용히 처리
- 네트워크 실패로 토큰 교환 실패 → "로그인에 실패했습니다. 다시 시도해주세요" 메시지 + 재시도 버튼
- 딥링크가 앱을 못 열고 브라우저에 멈춰있는 경우 → Supabase 콜백 페이지에 "앱으로 돌아가기" 링크 표시 (폴백)
- 세션 만료(토큰 refresh 실패) → 자동 로그아웃 후 로그인 화면으로

## 테스트 범위

자동화 테스트는 포함하지 않는다 (프로젝트에 테스트 도구 없음, 수동 QA로 대체):
- iOS 시뮬레이터 + 실기기 1대에서 구글/카카오 로그인 각각 수동 확인
- Android 에뮬레이터 + 실기기 1대에서 구글/카카오 로그인 각각 수동 확인
- 로그아웃 → 재로그인 → 앱 재실행 시 자동 로그인(세션 유지) 확인
- 기존 일정/순위 기능이 Capacitor WebView 안에서도 정상 동작하는지 확인 (Jolpica API가 CORS 제한 없이 열려있어 큰 이슈는 예상되지 않으나 1회 검증 필요)

## 진행 상황 추적

구현 단계별 체크리스트는 `docs/superpowers/plans/2026-07-10-app-social-login.md`에서 관리한다. 세션이 끊긴 경우, 이 스펙 문서(결정사항)와 plans 문서(진행 체크박스)를 함께 읽으면 바로 이어서 작업할 수 있다.
