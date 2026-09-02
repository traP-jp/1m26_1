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
 */
export async function getTimeline(sortByPopularity = false): Promise<ApiTimelineMessage> {
    const url = createApiUrl(endpoints.timeline)
    url.searchParams.set('SortByPopularity', String(sortByPopularity))
    return requestJson<ApiTimelineMessage>(url.toString())
}

/**
 * 新着メッセージを取得する。
 * @param sortByPopularity - true: 人気順, false: 最新順（デフォルト）
 * @returns 新着メッセージのIDリスト、または新着がない場合は null
 */
export async function getTimelineNew(sortByPopularity = false): Promise<ApiTimelineMessage | null> {
    const url = createApiUrl(endpoints.timelineNew)
    url.searchParams.set('SortByPopularity', String(sortByPopularity))
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
    return response.json() as Promise<ApiTimelineMessage>
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
