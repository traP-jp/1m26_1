import { useAuthStore } from '../stores/authStore'
import { oneMonthonApi } from '../lib/api/endpoints'

const TRAQ_AUTH_URL = 'https://q.trap.jp/api/v3/oauth2/authorize'
const CLIENT_ID = import.meta.env.VITE_TRAQ_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_TRAQ_REDIRECT_URI

export async function initiateLogin() {
  if (!CLIENT_ID) throw new Error('VITE_TRAQ_CLIENT_ID が設定されていません')
  if (!REDIRECT_URI) throw new Error('VITE_TRAQ_REDIRECT_URI が設定されていません')

  const state = crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: 'openid profile',
  })

  window.location.href = `${TRAQ_AUTH_URL}?${params.toString()}`
}

export async function handleOAuthCallback(
  code: string,
  state: string,
  redirectPath: string = '/',
): Promise<{ success: boolean; redirectTo: string; error?: string }> {
  const savedState = sessionStorage.getItem('oauth_state')
  if (!state || state !== savedState) {
    sessionStorage.removeItem('oauth_state')
    return {
      success: false,
      redirectTo: '/',
      error: 'CSRF対策のstateが一致しません。もう一度お試しください。',
    }
  }

  try {
    const response = await oneMonthonApi.exchangeOAuthCode(code)
    const authStore = useAuthStore()
    authStore.setToken(response.access_token)

    const redirect = sessionStorage.getItem('login_redirect') || redirectPath
    sessionStorage.removeItem('login_redirect')
    sessionStorage.removeItem('oauth_state')

    return { success: true, redirectTo: redirect }
  } catch (err) {
    sessionStorage.removeItem('oauth_state')
    const errorMessage = err instanceof Error ? err.message : 'トークン交換に失敗しました。'
    console.error('OAuth トークン交換エラー:', err)
    return {
      success: false,
      redirectTo: '/',
      error: `認証に失敗しました: ${errorMessage}`,
    }
  }
}
