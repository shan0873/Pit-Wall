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

  let resumeListenerHandle = null;
  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;
    let session = null;
    try {
      session = await getSession();
    } catch (err) {
      console.error(err);
    }
    if (!session) {
      setLoading(false);
    } else if (resumeListenerHandle) {
      resumeListenerHandle.remove();
    }
  }).then((handle) => {
    resumeListenerHandle = handle;
  });

  googleBtn.addEventListener('click', () => handleLogin(signInWithGoogle));
  kakaoBtn.addEventListener('click', () => handleLogin(signInWithKakao));
}
