import type { components } from '../../gen/api-types'
import { useAuthStore } from '../../stores/authStore'
import { apiBaseUrl } from './client'

export const endpoints = {
    healthz: '/healthz',
    me: '/api/users/me',
    user: (userId: string) => `/api/users/${encodeURIComponent(userId)}`,
    timeline: '/api/timeline',
    timelineNew: '/api/timeline/new',
    websocket: '/api/ws',
    oauthToken: '/api/oauth/token',
} as const

export type HealthResponse = { status: string }
export type ApiUser = components['schemas']['User']
export type ApiUserProfile = components['schemas']['UserProfile']
export type ApiTimelineMessage = components['schemas']['TimelineMessage']
export type OAuthResponse = components['schemas']['OAuthResponse']

function createApiUrl(path: string): URL {
    return new URL(path, apiBaseUrl)
}

/** skipAuth を指定すると Authorization ヘッダを付けない（認証前のリクエスト用）。 */
type ApiRequestInit = RequestInit & { skipAuth?: boolean }

/**
 * バックエンド向けのリクエストヘッダを組み立てる。
 * バックエンドは Authorization: Bearer からログイン中のユーザーを解決する。
 */
function buildHeaders(init?: ApiRequestInit): HeadersInit | undefined {
    const headers = new Headers(init?.headers)
    if (!init?.skipAuth) {
        const token = useAuthStore().accessToken
        if (token) {
            headers.set('Authorization', `Bearer ${token}`)
        }
    }
    return headers
}

/**
 * APIリクエストを送信し、JSONレスポンスを返す。
 * @param path - エンドポイントパス（例: '/api/users/me'）
 * @param init - 追加の fetch オプション（例: { skipAuth: true }）
 */
async function requestJson<T>(path: string, init?: ApiRequestInit): Promise<T> {
    const url = createApiUrl(path)
    const response = await fetch(url.toString(), { ...init, headers: buildHeaders(init) })
    if (!response.ok) {
        // エラーボディがあれば含める
        const errorBody = await response.text().catch(() => '')
        throw new Error(
            `API request failed: ${response.status}${errorBody ? ` - ${errorBody}` : ''}`,
        )
    }
    return response.json() as Promise<T>
}

export async function getHealthz(): Promise<HealthResponse> {
    return requestJson<HealthResponse>(endpoints.healthz)
}

export async function getMe(): Promise<ApiUser> {
    return requestJson<ApiUser>(endpoints.me)
}

export async function getUser(userId: string): Promise<ApiUserProfile> {
    return requestJson<ApiUserProfile>(endpoints.user(userId))
}

/**
 * タイムラインを取得する。
 * @param sortByPopularity - true: 人気順, false: 最新順（デフォルト）
 * @param before - この日時（ISO 8601）より古い投稿を取得する。
 *   省略すると最新から取得する。クライアントの時計のズレで直近の投稿を
 *   取りこぼさないよう、「最新から」のときは値を作らず必ず省略すること。
 * @returns 投稿本文とスタンプ集計値を含むメッセージの配列
 */
export async function getTimeline(
    sortByPopularity = false,
    before?: string,
): Promise<ApiTimelineMessage[]> {
    const url = createApiUrl(endpoints.timeline)
    url.searchParams.set('sortByPopularity', String(sortByPopularity))
    if (before) {
        url.searchParams.set('before', before)
    }
    return requestJson<ApiTimelineMessage[]>(url.toString())
}

/**
 * 新着メッセージを取得する。
 * @param sortByPopularity - true: 人気順, false: 最新順（デフォルト）
 * @param after - この日時（ISO 8601）より後の投稿を取得する。
 *   通常は今表示している中で最も新しい投稿の createdAt を渡す。
 * @returns 新着メッセージの配列、または新着がない場合は null
 */
export async function getTimelineNew(
    sortByPopularity = false,
    after?: string,
): Promise<ApiTimelineMessage[] | null> {
    const url = createApiUrl(endpoints.timelineNew)
    url.searchParams.set('sortByPopularity', String(sortByPopularity))
    if (after) {
        url.searchParams.set('after', after)
    }
    const response = await fetch(url.toString(), { headers: buildHeaders() })
    if (response.status === 204) {
        return null
    }
    if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        throw new Error(
            `API request failed: ${response.status}${errorBody ? ` - ${errorBody}` : ''}`,
        )
    }
    return response.json() as Promise<ApiTimelineMessage[]>
}

/**
 * WebSocket接続を開始する。
 * @param path - デフォルトは /api/ws
 */
export function createWebSocket(path = endpoints.websocket): WebSocket {
    const url = createApiUrl(path)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return new WebSocket(url.toString())
}

/**
 * 認可コードをアクセストークンと交換する。
 * @param code - traQ から取得した認可コード
 * @param codeVerifier - PKCE のベリファイア
 * @returns OAuth レスポンス（アクセストークン等）
 */
export async function exchangeOAuthCode(
    code: string,
    codeVerifier: string,
): Promise<OAuthResponse> {
    // このエンドポイントだけは認証前に叩くため、Authorization は付けない。
    // Cookie も使わないので credentials も不要。
    return requestJson<OAuthResponse>(endpoints.oauthToken, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, code_verifier: codeVerifier }),
        skipAuth: true,
    })
}

export const oneMonthonApi = {
    getHealthz,
    getMe,
    getUser,
    getTimeline,
    getTimelineNew,
    createWebSocket,
    exchangeOAuthCode,
} as const
