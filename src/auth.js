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
