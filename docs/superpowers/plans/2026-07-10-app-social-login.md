# 앱 패키징 + 카카오/구글 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **주의:** Task 3, Task 10, Task 11, Task 12은 사람이 직접 해야 하는 수동 작업(외부 계정 생성, 결제, 시뮬레이터/실기기 조작, 스토어 심사 제출)을 포함한다. 에이전트가 자동으로 완료할 수 없으니, 해당 태스크는 사용자에게 안내만 하고 완료 확인을 받은 뒤 다음 태스크로 넘어간다.

**Goal:** 정적 단일 `index.html`로 되어있는 Pit-Wall을 Vite 기반 프로젝트로 전환하고, Capacitor로 iOS/Android 앱으로 패키징하며, Supabase Auth를 통한 구글/카카오 필수 로그인 게이트를 추가해 스토어 제출까지 진행한다.

**Architecture:** Vite가 빌드하는 vanilla JS 모듈(`src/main.js`가 로그인 화면 ↔ 메인 화면 라우팅) + Capacitor 네이티브 셸 + Supabase Auth(OAuth 2 provider: Google, Kakao) + Capacitor Browser/App 플러그인을 이용한 시스템 브라우저 로그인 → 딥링크 콜백 방식. 백엔드 서버 코드는 작성하지 않는다(Supabase가 관리형으로 처리).

**Tech Stack:** Vite, vanilla JS(ES modules), `@supabase/supabase-js`, `@capacitor/core` `@capacitor/cli` `@capacitor/browser` `@capacitor/app`, GitHub Pages(GitHub Actions) 배포. 자동화 테스트 프레임워크 없음 — 기존 프로젝트 관례대로 브라우저/시뮬레이터 수동 검증 + 커밋으로 대체한다.

---

## 참고: 관련 스펙

`docs/superpowers/specs/2026-07-10-app-social-login-design.md`

## 파일 구조 (변경/생성될 파일)

```
Pit-Wall/
├── package.json                          (신규)
├── vite.config.js                        (신규)
├── capacitor.config.json                 (신규, Task 2)
├── .env.local                            (신규, gitignore 처리, 사용자가 직접 값 채움)
├── .env.local.example                    (신규, 커밋됨 — 키 이름만, 값 없음)
├── .gitignore                            (수정 — dist/, .env.local 추가)
├── index.html                            (전면 재작성 — Vite 엔트리)
├── src/
│   ├── style.css                         (신규 — 기존 <style> 내용 이관)
│   ├── app-view.js                       (신규 — 기존 <script> 로직 이관 + 로그아웃 버튼)
│   ├── auth.js                           (신규 — Supabase 클라이언트, OAuth, 딥링크 처리)
│   ├── login-view.js                     (신규 — 로그인 화면 UI)
│   └── main.js                           (신규 — 로그인 게이트 라우팅)
├── ios/                                   (신규, Capacitor 자동 생성, Task 2)
├── android/                               (신규, Capacitor 자동 생성, Task 2)
└── .github/workflows/pages.yml           (수정 — Vite 빌드 후 dist/ 배포)
```

---

### Task 1: Vite 프로젝트로 전환 (기존 기능 그대로 이관)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `src/style.css`
- Create: `src/app-view.js`
- Create: `src/main.js` (임시 버전 — 로그인 게이트는 Task 6에서 추가)
- Modify: `index.html` (전면 재작성)
- Modify: `.gitignore`

- [ ] **Step 1: package.json 생성 및 Vite 설치**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm init -y
npm install -D vite
```
Expected: `package.json`, `package-lock.json`, `node_modules/` 생성됨. 에러 없이 종료.

- [ ] **Step 2: package.json에 type/scripts 추가**

`package.json`을 열어 `"type": "module"`과 `"scripts"`를 아래처럼 채운다 (`npm init -y`가 만든 기본값 위에 병합):

```json
{
  "name": "pit-wall",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

(`devDependencies`의 vite 버전은 Step 1에서 설치된 실제 버전을 그대로 둔다 — 위 `^5.0.0`은 예시.)

- [ ] **Step 3: vite.config.js 생성**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8765,
  },
});
```

- [ ] **Step 4: 기존 index.html의 CSS를 src/style.css로 이관**

현재 `index.html`의 `<style>...</style>` 블록(대략 8~74번째 줄) 안의 CSS 전체를 그대로 `src/style.css`로 옮긴다. 파일 내용은 기존 `<style>` 태그 내부 텍스트와 동일하되, 최상단에 아래 한 줄만 추가한다:

```css
/* moved from index.html <style> — Vite entry stylesheet */
```

(즉 `:root{...}` 부터 `footer{...}` 까지 기존 CSS 규칙을 한 글자도 바꾸지 않고 그대로 붙여넣는다.)

- [ ] **Step 5: 기존 index.html의 JS 로직을 src/app-view.js로 이관 + 로그아웃 버튼 추가**

현재 `index.html`의 `<script>...</script>` 블록(110~398번째 줄) 안의 JS 전체를, 아래 구조로 `src/app-view.js`에 옮긴다:

1. 파일 맨 위에 `export function initApp(onLogout) { ... }` 함수를 열고, 기존 스크립트 내용 전체(변수 선언, 함수 정의, 마지막의 `loadSchedule()...`, `loadStandings();` 호출까지)를 이 함수 본문 안으로 넣는다.
2. 헤더에 로그아웃 버튼을 추가하기 위해, `renderCountdown` 등과 별개로 `initApp` 맨 앞부분에 아래 코드를 추가한다 (헤더에 로그아웃 버튼을 DOM으로 삽입):

```js
export function initApp(onLogout) {
  const headerEl = document.querySelector('header');
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = '로그아웃';
  logoutBtn.className = 'secondary';
  logoutBtn.style.cssText = 'position:absolute; top:20px; right:16px; padding:6px 12px; font-size:12px;';
  logoutBtn.onclick = onLogout;
  headerEl.style.position = 'relative';
  headerEl.appendChild(logoutBtn);

  // --- 기존 index.html <script> 내용 전체를 여기에 그대로 붙여넣는다 ---
  // (const API = ...; 부터 loadStandings(); 까지, 한 글자도 바꾸지 않음)
}
```

3. 기존 스크립트 맨 마지막에 있던 아래 두 줄:
```js
loadSchedule().catch(e => { ... });
loadStandings();
```
은 `initApp` 함수 본문의 맨 마지막 줄로 그대로 유지한다 (즉 함수가 호출되면 바로 데이터 로딩이 시작됨).

- [ ] **Step 6: main.js 임시 버전 작성 (로그인 게이트 없이 바로 렌더)**

```js
import './style.css';
import { initApp } from './app-view.js';

initApp(() => {
  alert('로그아웃 기능은 Task 6에서 연결됩니다.');
});
```

- [ ] **Step 7: index.html을 Vite 엔트리로 재작성**

`index.html`을 아래 내용으로 전체 교체한다 (기존 `<style>`, `<script>` 내용은 이미 Step 4~5에서 옮겼으므로 제거하고, `<div class="wrap">` 이하 마크업 구조는 그대로 유지):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>F1 KST — 일정 &amp; 순위</title>
</head>
<body>

<header>
  <h1>🏁 F1 KST <span class="badge">MVP F-01~F-05</span></h1>
  <div class="sub">한국시간 기준 일정 &amp; 실시간 순위 · 데이터: Jolpica-F1 (Ergast 호환)</div>
</header>

<div class="wrap">

  <div class="card" id="countdown-card">
    <h2>다음 세션 카운트다운</h2>
    <div id="countdown-body"><div class="loading">불러오는 중...</div></div>
  </div>

  <div class="card">
    <h2>시즌 일정 (2026)</h2>
    <div id="schedule-body"><div class="loading">불러오는 중...</div></div>
  </div>

  <div class="card">
    <h2>순위</h2>
    <div class="tabs">
      <div class="tab active" data-tab="drivers">드라이버</div>
      <div class="tab" data-tab="constructors">컨스트럭터</div>
    </div>
    <div id="drivers-body"><div class="loading">불러오는 중...</div></div>
    <div id="constructors-body" class="hidden"></div>
  </div>

  <footer>
    데이터 출처: Jolpica-F1 API (api.jolpi.ca) · 프로토타입 데모용, 공식 F1 라이선스와 무관
  </footer>
</div>

<script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 8: .gitignore에 dist/, .env.local 추가**

`.gitignore`를 아래 내용으로 교체:

```
github_token.txt
.DS_Store
node_modules/
dist/
.env.local
```

- [ ] **Step 9: 로컬에서 동작 확인**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm run dev
```
Expected: `Local: http://localhost:8765/` 로그 출력. 브라우저로 열어서 기존과 동일하게 카운트다운/일정/순위가 렌더링되는지 확인하고, 헤더 우측에 "로그아웃" 버튼이 보이는지 확인한다. 확인 후 `Ctrl+C`로 서버 종료.

- [ ] **Step 10: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add package.json package-lock.json vite.config.js index.html src/ .gitignore
git commit -m "refactor: migrate static index.html to Vite project structure"
```

---

### Task 2: Capacitor 설치 및 iOS/Android 네이티브 프로젝트 생성

**Files:**
- Create: `capacitor.config.json`
- Create: `ios/` (Capacitor 자동 생성)
- Create: `android/` (Capacitor 자동 생성)
- Modify: `package.json`

- [ ] **Step 1: 사전 요구사항 확인**

Run:
```bash
xcodebuild -version
```
Expected: Xcode 버전 정보 출력. 만약 "command not found"라면 App Store에서 Xcode를 먼저 설치해야 iOS 플랫폼 추가가 가능하다 (이 설치는 수동 작업, 수 GB 다운로드로 시간이 걸릴 수 있음).

Run:
```bash
which java && echo $ANDROID_HOME
```
Expected: 둘 다 경로가 출력됨. 비어있다면 Android Studio를 설치하고 SDK 경로를 `ANDROID_HOME` 환경변수로 설정해야 한다 (수동 작업).

- [ ] **Step 2: Capacitor core/cli 설치**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm install @capacitor/core
npm install -D @capacitor/cli
```
Expected: 에러 없이 종료.

- [ ] **Step 3: Capacitor 초기화**

Run:
```bash
npx cap init "Pit-Wall" "com.shan0873.pitwall" --web-dir dist
```
Expected: `capacitor.config.json` 파일 생성됨.

- [ ] **Step 4: 빌드 산출물 생성 후 플랫폼 추가**

Run:
```bash
npm run build
npx cap add ios
npx cap add android
```
Expected: `ios/`, `android/` 디렉토리가 생성되고, 각 디렉토리 안에 Capacitor가 자체적으로 만든 `.gitignore`가 포함되어 있음(빌드 산출물/캐시는 자동으로 git 추적에서 제외됨).

- [ ] **Step 5: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add capacitor.config.json package.json package-lock.json ios/ android/
git commit -m "feat: add Capacitor iOS/Android native project scaffolding"
```

---

### Task 3: 외부 서비스 계정 및 OAuth 앱 준비 (수동 작업 — 사람이 직접 진행)

> 이 태스크는 코드 작성이 아니라 웹 대시보드에서 계정을 만들고 값을 발급받는 작업이다. 에이전트가 대신 로그인/가입할 수 없으므로, 아래 각 단계를 사용자가 직접 완료한 뒤 체크한다.

**Files:**
- Create: `.env.local` (커밋되지 않음, 사용자가 직접 값 채움)
- Create: `.env.local.example` (커밋됨)

- [ ] **Step 1: Supabase 프로젝트 생성**

https://supabase.com 에서 새 프로젝트 생성 (프로젝트 이름: `pit-wall`, 리전은 가까운 곳 선택).
Expected: 프로젝트 대시보드의 Settings → API에서 **Project URL**과 **anon public key**를 확인할 수 있음. 이 두 값을 메모해둔다.

- [ ] **Step 2: Google Cloud Console에서 OAuth 클라이언트 생성**

1. Supabase 대시보드 → Authentication → Providers → Google을 열어 **Callback URL (for OAuth)** 값을 복사해둔다 (형식: `https://<project-ref>.supabase.co/auth/v1/callback`).
2. https://console.cloud.google.com → 새 프로젝트(또는 기존 프로젝트) → APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: **Web application**.
3. Authorized redirect URIs에 Step 1에서 복사한 Callback URL을 붙여넣는다.
Expected: Client ID와 Client Secret 발급됨.

- [ ] **Step 3: Kakao Developers에서 앱 등록**

1. https://developers.kakao.com → 내 애플리케이션 → 애플리케이션 추가하기 (앱 이름: `Pit-Wall`).
2. 제품 설정 → 카카오 로그인 → 활성화 설정 ON.
3. Redirect URI에 Step 2와 동일한 방식으로, Supabase 대시보드 Authentication → Providers → Kakao에서 제공하는 Callback URL을 등록.
Expected: REST API 키 확보.

- [ ] **Step 4: Supabase에 Provider 값 입력**

Supabase 대시보드 → Authentication → Providers에서 Google과 Kakao를 각각 Enable 하고, Step 2/3에서 발급받은 Client ID/Secret(또는 REST API 키)을 입력 후 저장.

- [ ] **Step 5: Redirect URL 허용 목록에 딥링크 스킴 추가**

Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs에 `pitwall://auth-callback`을 추가.

- [ ] **Step 6: .env.local.example 생성 (커밋용, 값 없음)**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: .env.local 생성 (실제 값, 커밋 안 됨)**

Step 1에서 메모한 Project URL과 anon key를 사용해 `/Users/mark.sehun/projects/Pit-Wall/.env.local` 파일을 만든다:

```
VITE_SUPABASE_URL=<Step 1에서 확인한 Project URL>
VITE_SUPABASE_ANON_KEY=<Step 1에서 확인한 anon public key>
```

- [ ] **Step 8: Commit (.env.local.example만)**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add .env.local.example
git commit -m "docs: add env var template for Supabase config"
```

---

### Task 4: Supabase Auth 클라이언트 작성 (src/auth.js)

**Files:**
- Create: `src/auth.js`
- Modify: `package.json`

- [ ] **Step 1: 의존성 설치**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm install @supabase/supabase-js
npm install @capacitor/browser @capacitor/app
```
Expected: 에러 없이 종료, `package.json`의 `dependencies`에 세 패키지 추가됨.

- [ ] **Step 2: src/auth.js 작성**

```js
import { createClient } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

const REDIRECT_URL = 'pitwall://auth-callback';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function startOAuth(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  await Browser.open({ url: data.url });
}

export function signInWithGoogle() {
  return startOAuth('google');
}

export function signInWithKakao() {
  return startOAuth('kakao');
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}

export function initDeepLinkListener() {
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.includes('auth-callback')) return;

    await Browser.close();

    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;
    const params = new URLSearchParams(url.slice(hashIndex + 1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  });
}
```

- [ ] **Step 3: 빌드로 문법 확인**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm run build
```
Expected: 에러 없이 `dist/` 생성됨 (아직 auth.js를 아무 곳에서도 import하지 않았으므로 tree-shaking으로 번들에 안 들어갈 수 있으나, 빌드 자체는 성공해야 함).

- [ ] **Step 4: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add src/auth.js package.json package-lock.json
git commit -m "feat: add Supabase auth client with OAuth and deep link handling"
```

---

### Task 5: 로그인 화면 UI (src/login-view.js)

**Files:**
- Create: `src/login-view.js`
- Modify: `src/style.css`

- [ ] **Step 1: 로그인 화면 스타일 추가**

`src/style.css` 맨 아래에 추가:

```css
.login-screen{
  min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:24px; text-align:center; gap:18px;
}
.login-screen h1{font-size:24px; margin:0;}
.login-screen .sub{color:var(--muted); font-size:14px; margin-bottom:12px;}
.login-buttons{display:flex; flex-direction:column; gap:10px; width:100%; max-width:320px;}
.login-btn{
  width:100%; padding:12px; border-radius:10px; font-size:14px; font-weight:700; border:none; cursor:pointer;
}
.login-btn.google{background:#fff; color:#1f1f1f;}
.login-btn.kakao{background:#FEE500; color:#1f1f1f;}
.login-btn:disabled{opacity:.6; cursor:default;}
.login-error{color:#f87171; font-size:13px; min-height:18px;}
```

- [ ] **Step 2: src/login-view.js 작성**

```js
import { signInWithGoogle, signInWithKakao } from './auth.js';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-screen">
      <h1>🏁 F1 KST</h1>
      <div class="sub">로그인하고 일정 &amp; 순위를 확인하세요</div>
      <div class="login-buttons">
        <button id="login-google" class="login-btn google">구글로 계속하기</button>
        <button id="login-kakao" class="login-btn kakao">카카오로 계속하기</button>
      </div>
      <div class="login-error" id="login-error"></div>
    </div>
  `;

  const errorEl = container.querySelector('#login-error');
  const googleBtn = container.querySelector('#login-google');
  const kakaoBtn = container.querySelector('#login-kakao');

  function setLoading(isLoading) {
    googleBtn.disabled = isLoading;
    kakaoBtn.disabled = isLoading;
  }

  async function handleLogin(signInFn) {
    errorEl.textContent = '';
    setLoading(true);
    try {
      await signInFn();
    } catch (e) {
      errorEl.textContent = '로그인에 실패했습니다. 다시 시도해주세요.';
      setLoading(false);
    }
  }

  googleBtn.addEventListener('click', () => handleLogin(signInWithGoogle));
  kakaoBtn.addEventListener('click', () => handleLogin(signInWithKakao));
}
```

`setLoading(false)`는 성공 시 호출하지 않는다 — 성공하면 시스템 브라우저가 열리고 곧 딥링크로 돌아와 `main.js`가 화면을 통째로 메인 화면으로 교체하기 때문에, 버튼 비활성화 상태를 굳이 되돌릴 필요가 없다 (실패했을 때만 다시 눌러야 하므로 그때만 복원).

- [ ] **Step 3: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add src/login-view.js src/style.css
git commit -m "feat: add login screen UI for Google/Kakao sign-in"
```

---

### Task 6: 로그인 게이트 라우팅 (src/main.js)

**Files:**
- Modify: `src/main.js`
- Modify: `src/app-view.js:1-2` (initApp의 `onLogout` 콜백은 이미 Task 1에서 파라미터로 받아둔 상태 — 실제 signOut 연결만 하면 됨)

- [ ] **Step 1: main.js를 로그인 게이트 라우터로 재작성**

`src/main.js`를 아래 내용으로 전체 교체:

```js
import './style.css';
import { initApp } from './app-view.js';
import { renderLoginView } from './login-view.js';
import { getSession, onAuthStateChange, signOut, initDeepLinkListener } from './auth.js';

const root = document.body;
let appInitialized = false;

function showLogin() {
  root.innerHTML = '';
  const container = document.createElement('div');
  root.appendChild(container);
  renderLoginView(container);
}

function showApp() {
  if (appInitialized) return;
  appInitialized = true;
  root.innerHTML = `
    <header>
      <h1>🏁 F1 KST <span class="badge">MVP F-01~F-05</span></h1>
      <div class="sub">한국시간 기준 일정 &amp; 실시간 순위 · 데이터: Jolpica-F1 (Ergast 호환)</div>
    </header>
    <div class="wrap">
      <div class="card" id="countdown-card">
        <h2>다음 세션 카운트다운</h2>
        <div id="countdown-body"><div class="loading">불러오는 중...</div></div>
      </div>
      <div class="card">
        <h2>시즌 일정 (2026)</h2>
        <div id="schedule-body"><div class="loading">불러오는 중...</div></div>
      </div>
      <div class="card">
        <h2>순위</h2>
        <div class="tabs">
          <div class="tab active" data-tab="drivers">드라이버</div>
          <div class="tab" data-tab="constructors">컨스트럭터</div>
        </div>
        <div id="drivers-body"><div class="loading">불러오는 중...</div></div>
        <div id="constructors-body" class="hidden"></div>
      </div>
      <footer>
        데이터 출처: Jolpica-F1 API (api.jolpi.ca) · 프로토타입 데모용, 공식 F1 라이선스와 무관
      </footer>
    </div>
  `;
  initApp(async () => {
    await signOut();
  });
}

async function boot() {
  initDeepLinkListener();

  const session = await getSession();
  if (session) {
    showApp();
  } else {
    showLogin();
  }

  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showApp();
    } else if (event === 'SIGNED_OUT') {
      appInitialized = false;
      showLogin();
    }
  });
}

boot();
```

- [ ] **Step 2: index.html의 정적 마크업 제거 (main.js가 전부 렌더하므로 중복 제거)**

`index.html`의 `<body>` 내용을 아래로 교체 (헤더/카드 마크업은 `main.js`의 `showApp()`이 동적으로 생성하므로 제거하고, 빈 진입점만 남김):

```html
<body>
<script type="module" src="/src/main.js"></script>
</body>
```

- [ ] **Step 3: 로컬에서 동작 확인 (로그인 없이 라우팅만 확인)**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm run dev
```
Expected: 브라우저로 열면 로그인 화면(구글/카카오 버튼)이 뜬다. 아직 Task 3의 실제 Supabase 프로젝트 값이 `.env.local`에 없다면 콘솔에 Supabase 클라이언트 초기화 에러가 뜰 수 있음 — Task 3~4가 먼저 완료되어 있어야 정상 동작한다. 버튼 클릭 시 시스템 브라우저 대신 웹 브라우저 새 탭이 열리는지 확인 (Capacitor Browser 플러그인은 네이티브 환경에서만 시스템 브라우저를 열고, 순수 웹 환경에서는 새 탭으로 대체 동작함 — 정상).

- [ ] **Step 4: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add src/main.js index.html
git commit -m "feat: wire login gate routing between login and app views"
```

---

### Task 7: 딥링크 스킴 네이티브 설정 (iOS/Android)

**Files:**
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: iOS Info.plist에 URL Scheme 등록**

`ios/App/App/Info.plist`를 열어 `</dict>` 최상위 닫는 태그 바로 앞에 아래 블록을 추가한다:

```xml
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>pitwall</string>
			</array>
		</dict>
	</array>
```

- [ ] **Step 2: Android AndroidManifest.xml에 intent-filter 등록**

`android/app/src/main/AndroidManifest.xml`을 열어, 메인 `<activity>` 태그 안(기존 `MAIN`/`LAUNCHER` intent-filter 다음)에 아래 intent-filter를 추가:

```xml
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="pitwall" android:host="auth-callback" />
            </intent-filter>
```

- [ ] **Step 3: 빌드 산출물 동기화**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npm run build
npx cap sync
```
Expected: `√ copy ios`, `√ copy android`, `√ sync ios`, `√ sync android` 로그 출력, 에러 없음.

- [ ] **Step 4: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml
git commit -m "feat: register pitwall:// deep link scheme on iOS/Android"
```

---

### Task 8: 로그인 관련 에러 처리 보강

**Files:**
- Modify: `src/auth.js`
- Modify: `src/login-view.js`

- [ ] **Step 1: 세션 만료(토큰 refresh 실패) 시 자동 로그아웃 처리**

`src/auth.js`의 `onAuthStateChange` 함수는 이미 Task 6의 `main.js`에서 `'SIGNED_OUT'` 이벤트를 구독해 로그인 화면으로 돌리고 있다 (Supabase SDK는 refresh token이 만료/무효화되면 자동으로 `SIGNED_OUT` 이벤트를 발생시킨다). 별도 코드 추가는 필요 없으며, 아래 Step 2에서 수동으로 검증만 한다.

- [ ] **Step 2: 로그인 취소(시스템 브라우저에서 뒤로가기) 케이스 확인**

이 케이스는 이미 Task 5의 `login-view.js` 구조상 자동으로 처리된다: 사용자가 시스템 브라우저를 닫거나 뒤로가면 `appUrlOpen` 이벤트 자체가 발생하지 않으므로 앱은 계속 로그인 화면에 머무른다 (버튼이 `disabled` 상태로 남는 문제는 없는지 아래 Step 3에서 확인).

- [ ] **Step 3: 브라우저 취소 시 버튼 재활성화 처리 추가**

`src/login-view.js`의 `handleLogin` 함수를 아래로 교체 (Capacitor App 플러그인의 `appStateChange` 이벤트로, 브라우저가 닫히고 앱이 다시 포그라운드로 돌아왔는데 로그인이 안 되어 있으면 버튼을 복원):

```js
import { signInWithGoogle, signInWithKakao, getSession } from './auth.js';
import { App } from '@capacitor/app';

export function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-screen">
      <h1>🏁 F1 KST</h1>
      <div class="sub">로그인하고 일정 &amp; 순위를 확인하세요</div>
      <div class="login-buttons">
        <button id="login-google" class="login-btn google">구글로 계속하기</button>
        <button id="login-kakao" class="login-btn kakao">카카오로 계속하기</button>
      </div>
      <div class="login-error" id="login-error"></div>
    </div>
  `;

  const errorEl = container.querySelector('#login-error');
  const googleBtn = container.querySelector('#login-google');
  const kakaoBtn = container.querySelector('#login-kakao');

  function setLoading(isLoading) {
    googleBtn.disabled = isLoading;
    kakaoBtn.disabled = isLoading;
  }

  async function handleLogin(signInFn) {
    errorEl.textContent = '';
    setLoading(true);
    try {
      await signInFn();
    } catch (e) {
      errorEl.textContent = '로그인에 실패했습니다. 다시 시도해주세요.';
      setLoading(false);
    }
  }

  const resumeListener = App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;
    const session = await getSession();
    if (!session) {
      setLoading(false);
    } else {
      resumeListener.remove();
    }
  });

  googleBtn.addEventListener('click', () => handleLogin(signInWithGoogle));
  kakaoBtn.addEventListener('click', () => handleLogin(signInWithKakao));
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add src/login-view.js
git commit -m "fix: re-enable login buttons when app resumes without a session"
```

---

### Task 9: GitHub Pages 배포 워크플로우를 Vite 빌드로 조정

**Files:**
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: GitHub 저장소에 Repository Variables 추가 (수동)**

GitHub 저장소 → Settings → Secrets and variables → Actions → Variables 탭에서 아래 두 개를 추가한다 (anon key는 클라이언트 노출에 안전한 값이라 Secret이 아닌 Variable로 등록):
- `VITE_SUPABASE_URL` = Task 3에서 확인한 Project URL
- `VITE_SUPABASE_ANON_KEY` = Task 3에서 확인한 anon public key

- [ ] **Step 2: 워크플로우 수정**

`.github/workflows/pages.yml`을 아래 내용으로 전체 교체:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit 및 push, 배포 확인**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add .github/workflows/pages.yml
git commit -m "ci: build with Vite and deploy dist/ to GitHub Pages"
git push origin main
```
Expected: push 후 GitHub Actions 탭에서 워크플로우가 성공(초록색 체크)하는지 확인. 완료 후:
```bash
sleep 30
curl -s -o /dev/null -w "%{http_code}\n" https://shan0873.github.io/Pit-Wall/
```
Expected: `200`

---

### Task 10: 네이티브 빌드 확인 및 스토어 자산 준비 (수동 작업 포함)

**Files:**
- Modify: `ios/App/App/Assets.xcassets/` (아이콘, Xcode에서 직접 작업)
- Modify: `android/app/src/main/res/` (아이콘, Android Studio에서 직접 작업)

- [ ] **Step 1: iOS 시뮬레이터에서 빌드 확인**

Run:
```bash
cd /Users/mark.sehun/projects/Pit-Wall
npx cap open ios
```
Expected: Xcode가 열림. Xcode에서 시뮬레이터를 선택하고 ▶ Run. 앱이 실행되며 로그인 화면이 보이면 성공.

- [ ] **Step 2: Android 에뮬레이터에서 빌드 확인**

Run:
```bash
npx cap open android
```
Expected: Android Studio가 열림. 에뮬레이터를 선택하고 Run. 앱이 실행되며 로그인 화면이 보이면 성공.

- [ ] **Step 3: 앱 아이콘/스플래시 준비 (수동)**

로고 이미지(1024x1024 PNG 권장)를 준비한 뒤, 아래 도구로 각 해상도별 아이콘을 자동 생성한다:

Run:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0b0e14' --splashBackgroundColor '#0b0e14'
```
Expected: `ios/`, `android/`의 각 해상도 아이콘/스플래시 이미지가 갱신됨. (로고 이미지가 없다면 이 단계는 스토어 제출 직전까지 보류 가능 — Capacitor 기본 플레이스홀더 아이콘으로 시뮬레이터 테스트는 문제없이 진행된다.)

- [ ] **Step 4: Commit**

```bash
cd /Users/mark.sehun/projects/Pit-Wall
git add -A
git commit -m "chore: generate app icons and splash screens"
```

---

### Task 11: 수동 QA — 실기기 로그인 플로우 전체 검증 (수동 작업)

**Files:** 없음 (검증 전용)

- [ ] **Step 1: iOS 실기기에서 구글 로그인 확인**

실기기를 Mac에 연결 → Xcode에서 기기 선택 → Run. 앱 실행 → "구글로 계속하기" 클릭 → 시스템 브라우저(SFSafariViewController)가 열리는지, 로그인 후 앱으로 자동 복귀하는지, 메인 화면(일정/순위)이 뜨는지 확인.

- [ ] **Step 2: iOS 실기기에서 카카오 로그인 확인**

동일한 방식으로 "카카오로 계속하기" 버튼 확인.

- [ ] **Step 3: Android 실기기에서 구글/카카오 로그인 확인**

Android 기기를 연결 → Android Studio에서 Run → 동일하게 두 로그인 버튼 각각 확인.

- [ ] **Step 4: 로그아웃 → 재로그인 → 앱 재실행 세션 유지 확인**

헤더의 "로그아웃" 버튼 클릭 → 로그인 화면으로 돌아가는지 확인. 다시 로그인 → 앱을 완전히 종료(백그라운드에서 스와이프 제거) 후 재실행 → 로그인 화면 없이 바로 메인 화면이 뜨는지(세션 유지) 확인.

- [ ] **Step 5: 기존 일정/순위 기능 회귀 확인**

메인 화면에서 카운트다운, 시즌 일정(진행중/예정/완료 그룹), 드라이버/컨스트럭터 순위 탭 전환이 웹 버전과 동일하게 동작하는지 확인.

---

### Task 12: 스토어 제출 준비 및 제출 (수동 작업)

**Files:** 없음 (외부 콘솔 작업)

- [ ] **Step 1: Apple Developer Program 가입**

https://developer.apple.com/programs/enroll/ 에서 가입 ($99/년). Expected: 계정 상태가 App Store Connect에서 "Active"로 표시됨 (승인까지 1~2일 소요될 수 있음).

- [ ] **Step 2: Google Play Console 계정 생성**

https://play.google.com/console/signup 에서 가입 ($25 1회). Expected: Play Console 대시보드 접근 가능.

- [ ] **Step 3: App Store Connect에서 앱 등록 및 TestFlight 내부 테스트**

App Store Connect → 새 앱 생성 (번들 ID: `com.shan0873.pitwall`) → Xcode에서 Archive → TestFlight 업로드 → 내부 테스터로 직접 설치해 최종 확인.

- [ ] **Step 4: 애플 심사 제출 전 최종 판단 — Apple Sign-In 필요 여부**

`docs/superpowers/specs/2026-07-10-app-social-login-design.md`의 "리스크 — Apple Sign-In" 항목을 다시 확인한다. 구글/카카오 로그인만으로 제출할지, 애플 로그인을 추가로 붙일지 이 시점에 결정한다 (추가하기로 하면 별도 후속 계획으로 Supabase Apple provider 설정 + 버튼 추가 작업을 진행).

- [ ] **Step 5: App Store 심사 제출**

App Store Connect에서 심사 제출. Expected: 1~3일 내 승인 또는 반려 피드백.

- [ ] **Step 6: Play Console에서 프로덕션 빌드 업로드 및 심사 제출**

Android Studio에서 서명된 AAB 빌드 → Play Console → 프로덕션 트랙 → 업로드 → 심사 제출. Expected: 심사 결과 통보.

---

## Self-Review 메모

- **스펙 커버리지**: 스펙의 모든 섹션(아키텍처, 로그인 플로우, 프로젝트 구조, 스토어 출시 단계, 에러 처리, 테스트 범위)에 대응하는 태스크가 각각 존재함 (Task 1~2 아키텍처/구조, Task 3~4 백엔드 연동, Task 5~6 로그인 UI/게이트, Task 7 딥링크 네이티브 설정, Task 8 에러 처리, Task 9 배포, Task 10~12 스토어 출시/QA).
- **플레이스홀더 스캔**: "TBD"/"나중에 구현" 등 미완성 문구 없음. Task 3/10/12의 외부 계정 값은 사용자가 직접 발급받아 채우는 값으로, 코드 로직상의 미완성이 아님.
- **타입/시그니처 일관성**: `initApp(onLogout)` (Task 1) → Task 6의 `main.js`에서 동일 시그니처로 호출. `renderLoginView(container)` (Task 5) → Task 6에서 동일 시그니처로 호출. `signInWithGoogle`/`signInWithKakao`/`signOut`/`getSession`/`onAuthStateChange`/`initDeepLinkListener` 함수명이 Task 4(정의)와 Task 5/6/8(사용) 전체에서 일치함.

