# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Pit-Wall은 F1 팬용 일정·순위 앱이다. 시즌 일정을 한국시간(KST)으로 표시하고, 다음 세션 카운트다운·드라이버/컨스트럭터 순위를 제공한다. 웹(GitHub Pages)과 iOS/Android 앱(Capacitor)이 **같은 코드베이스**에서 나온다. 앱 진입 시 구글/카카오 소셜 로그인이 필수다(Supabase Auth).

- 웹 배포: https://shan0873.github.io/Pit-Wall/ (main push 시 GitHub Actions 자동 배포)
- 데이터: Jolpica-F1 API (`api.jolpi.ca`, Ergast 호환, 무인증) — 백엔드 서버 없음
- 인증: Supabase 관리형 (프로젝트 ref: `xjryroyfxpasuxumtbnf`)

## 필수 명령어

```bash
npm run dev          # Vite 개발 서버 (port 8765)
npm run build        # dist/ 생성 — cap sync 전에 반드시 실행
npx cap sync         # dist/를 ios/·android/에 복사 (웹 코드 수정 후 앱 반영 시 필수)
npx cap open ios     # Xcode 열기 (실기기/시뮬레이터 실행은 Xcode에서 ▶ Run)
```

iOS 시뮬레이터 CLI 빌드:
```bash
cd ios/App && xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,id=<UDID>' build
# UDID 조회: xcrun simctl list devices available
```

Android CLI 빌드 (JAVA_HOME 필수 — 시스템 java는 스텁이라 실패함):
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
# 에뮬레이터 AVD 이름: pitwall_test
```

자동화 테스트 없음(의도적). 검증은 빌드 성공 + 브라우저/시뮬레이터 수동 확인으로 한다.

## 환경 변수 (중요)

`.env.local`(gitignore됨)에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 **반드시 있어야 한다**. 없으면 빌드는 성공하지만 앱 로드 시 `createClient()`가 `supabaseUrl is required`로 즉시 크래시해 **빈 화면**이 뜬다. 빈 화면 증상이면 이것부터 의심할 것. 템플릿은 `.env.local.example`, 실제 값은 GitHub 저장소 Actions Variables(동일 이름)에도 등록되어 있다. anon key는 공개되어도 안전한 키다(RLS가 보안 경계).

## 아키텍처

빌드 없는 정적 HTML에서 출발해 Vite로 전환된 vanilla JS 프로젝트다. 프레임워크 없음.

**로그인 게이트 흐름** (여러 파일에 걸친 핵심 구조):

- `src/main.js` — 진입점이자 라우터. 부팅 시 `getSession()`으로 세션 확인 → 있으면 `showApp()`(메인 화면 마크업을 동적 생성 후 `initApp()` 호출), 없으면 `showLogin()`. **메인 화면의 HTML 마크업은 index.html이 아니라 main.js의 `showApp()`에 있다** — `index.html`의 body는 스크립트 태그 하나뿐이다.
- `src/app-view.js` — `initApp(onLogout)` 하나를 export. 기존 일정/순위/카운트다운 로직 전체가 이 함수 안에 있다. `setInterval`과 이벤트 리스너에 **teardown이 없으므로 재호출 금지** — 그래서 로그아웃/세션만료 시 반드시 `window.location.reload()`로 처리한다(in-place DOM 교체로 바꾸지 말 것).
- `src/auth.js` — Supabase 클라이언트(implicit flow 명시), OAuth 시작, 딥링크 콜백 처리. OAuth는 시스템 브라우저(Capacitor Browser)에서 열리고 `pitwall://auth-callback`으로 복귀하며, `initDeepLinkListener()`가 URL 해시에서 토큰을 추출해 세션을 설정한다.
- `src/login-view.js` — 로그인 화면. 로그인 취소 감지에 `appStateChange`와 `browserFinished` **두 리스너를 모두** 쓴다: iOS는 브라우저가 인앱 시트(SFSafariViewController)로 떠서 `appStateChange`가 발화하지 않기 때문에 `browserFinished`가 필수다. 하나만 남기고 지우면 iOS에서 로그인 취소 후 버튼이 영구 비활성화된다.

**딥링크 스킴** `pitwall://auth-callback`은 세 곳이 일치해야 한다: `src/auth.js`의 `REDIRECT_URL`, `ios/App/App/Info.plist`의 `CFBundleURLTypes`, `android/app/src/main/AndroidManifest.xml`의 intent-filter. Supabase 대시보드 Redirect URLs에도 등록 필요.

**iOS safe-area**: `index.html`의 viewport에 `viewport-fit=cover`가 있고 `src/style.css`의 body가 `env(safe-area-inset-*)` 패딩을 쓴다. 이걸 제거하면 노치에 헤더가 가려진다. `.login-screen`의 `min-height` calc도 이 패딩과 정확히 상쇄되도록 계산된 값이니 함께 수정할 것.

## 문서 규칙

- 설계 스펙: `docs/superpowers/specs/YYYY-MM-DD-<주제>-design.md`
- 구현 계획(체크박스 진행 추적): `docs/superpowers/plans/YYYY-MM-DD-<주제>.md`
- 프로젝트 현재 상태·작업 이력: `docs/STATUS.md` — **작업 세션을 마칠 때마다 업데이트할 것.** 새 세션에서 맥락 파악은 이 파일부터 읽는다.

## 알아둘 것

- 앱 ID: `com.shan0873.pitwall` (capacitor.config.json, Xcode, Gradle 모두 동일)
- 커밋 메시지는 conventional commits 스타일 (feat:/fix:/docs:/ci:/chore:)
- 워크트리는 `.worktrees/`(gitignore됨)에 만든다
- Apple 심사 리스크: 소셜 로그인만 있으면 가이드라인 4.8 때문에 Sign in with Apple 요구로 반려될 수 있다. 스토어 제출 직전에 추가 여부 판단 (아키텍처상 나중에 추가해도 문제없음 — 스펙 문서 참고)
- 카카오 로그인 KOE205 에러 = 카카오 개발자 콘솔 동의항목(이메일) 미설정
