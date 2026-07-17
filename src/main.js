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
    // Full page reload (not an in-place DOM swap back to the login view) is
    // intentional: app-view.js's initApp() starts a setInterval and DOM
    // listeners with no teardown mechanism. Reloading guarantees every
    // module-level variable, interval, and listener starts fresh next time,
    // instead of requiring cleanup code here.
    await signOut();
    window.location.reload();
  });
}

async function boot() {
  initDeepLinkListener();

  let session = null;
  try {
    session = await getSession();
  } catch (err) {
    console.error(err);
  }

  if (session) {
    showApp();
  } else {
    showLogin();
  }

  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session && !appInitialized) {
      showApp();
    } else if (event === 'SIGNED_OUT') {
      window.location.reload();
    }
  });
}

boot();
