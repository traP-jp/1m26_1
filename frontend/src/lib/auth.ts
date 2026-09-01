import { useAuthStore } from '../stores/authStore'
import { oneMonthonApi } from '../lib/api/endpoints'

const TRAQ_AUTH_URL = 'https://q.trap.jp/api/v3/oauth2/authorize'
const CLIENT_ID = import.meta.env.VITE_TRAQ_CLIENT_ID

// traQ の API・WebSocket にアクセスするには read が、スタンプの付与・削除には
// write が必要。openid / profile は ID Token とプロフィール取得用。
const SCOPE = 'openid profile read write'

const STATE_KEY = 'oauth_state'
const CODE_VERIFIER_KEY = 'oauth_code_verifier'

/** バイト列を base64url へ変換する（パディング無し）。 */
function toBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** PKCE の code_verifier を生成する（RFC 7636 の 43〜128 文字に収まる）。 */
function generateCodeVerifier(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return toBase64Url(bytes)
}

/** code_verifier から S256 方式の code_challenge を作る。 */
async function deriveCodeChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    return toBase64Url(new Uint8Array(digest))
}

/** 認可フローで使った一時的な値を消す。 */
function clearOAuthState() {
    sessionStorage.removeItem(STATE_KEY)
    sessionStorage.removeItem(CODE_VERIFIER_KEY)
}

export async function initiateLogin() {
    if (!CLIENT_ID) throw new Error('VITE_TRAQ_CLIENT_ID が設定されていません')

    const state = crypto.randomUUID()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await deriveCodeChallenge(codeVerifier)

    sessionStorage.setItem(STATE_KEY, state)
    sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)

    // リダイレクト先は traQ のクライアント登録時に固定されるため、
    // redirect_uri は送らない（traQ の認可リクエストの仕様に無い）。
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: SCOPE,
    })

    window.location.href = `${TRAQ_AUTH_URL}?${params.toString()}`
}

export async function handleOAuthCallback(
    code: string,
    state: string,
    redirectPath: string = '/',
): Promise<{ success: boolean; redirectTo: string; error?: string }> {
    const savedState = sessionStorage.getItem(STATE_KEY)
    const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY)

    if (!state || state !== savedState) {
        clearOAuthState()
        return {
            success: false,
            redirectTo: '/',
            error: 'CSRF対策のstateが一致しません。もう一度お試しください。',
        }
    }

    if (!codeVerifier) {
        clearOAuthState()
        return {
            success: false,
            redirectTo: '/',
            error: '認証セッションが失われました。もう一度お試しください。',
        }
    }

    try {
        const response = await oneMonthonApi.exchangeOAuthCode(code, codeVerifier)
        const authStore = useAuthStore()
        authStore.setToken(response.access_token)

        const redirect = sessionStorage.getItem('login_redirect') || redirectPath
        sessionStorage.removeItem('login_redirect')
        clearOAuthState()

        return { success: true, redirectTo: redirect }
    } catch (err) {
        clearOAuthState()
        const errorMessage = err instanceof Error ? err.message : 'トークン交換に失敗しました。'
        console.error('OAuth トークン交換エラー:', err)
        return {
            success: false,
            redirectTo: '/',
            error: `認証に失敗しました: ${errorMessage}`,
        }
    }
}
