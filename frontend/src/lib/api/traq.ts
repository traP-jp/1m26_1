import { apiClient } from './client'
import type { traQcomponents } from '@/types/traq'
// ============================================
// 1. traQ API ベースURL
// ============================================

const TRAQ_API_BASE = 'https://q.trap.jp/api/v3'

// ============================================
// 2. 型定義（traQ API v3 スキーマ準拠）
// ============================================

type ChannelsResponse = traQcomponents['schemas']['ChannelsResponse']
type Stamp = traQcomponents['schemas']['Stamp']
type Message = traQcomponents['schemas']['Message']
type User = traQcomponents['schemas']['UserDetail']
type MessageStamp = traQcomponents['schemas']['MessageStamp']
type FileInfo = traQcomponents['schemas']['FileInfo']
type MessageSearchResult = traQcomponents['schemas']['MessageSearchResult']
// ============================================
// 3. traQ API クライアント関数
// ============================================

/**
 * ユーザー情報を取得する
 */
export async function getUsers(): Promise<User[]> {
    const response = await apiClient.get<User[]>(
        `${TRAQ_API_BASE}/users`,
        { params: { includeSuspended: false } }, // 有効ユーザーのみ
    )
    return response.data
}

/**
 * ログイン中のユーザーの詳細情報を取得する。
 *
 * GET /users は bio・tags・homeChannel を含まない軽量な User しか返さないため、
 * プロフィール表示（自己紹介文など）が必要な場合は getUsers() ではなくこちらを使うこと。
 */
export async function getMe(): Promise<User> {
    const response = await apiClient.get<User>(`${TRAQ_API_BASE}/users/me`)
    return response.data
}

/**
 * チャンネル一覧を取得する。
 */
export async function getChannels(): Promise<ChannelsResponse> {
    const response = await apiClient.get<ChannelsResponse>(`${TRAQ_API_BASE}/channels`)
    return response.data
}

interface ChannelMessagesOptions {
    limit?: number
    offset?: number
    since?: string
    until?: string
    inclusive?: boolean
    order?: 'asc' | 'desc'
}

/**
 * 指定されたチャンネルのメッセージ一覧を取得する。
 * @param channelId - チャンネルID
 * @param options.limit - 取得件数（デフォルト: 50）
 * @param options.offset - オフセット（デフォルト: 0）
 * @param options.since - この日時以降のメッセージ（ISO 8601）
 * @param options.until - この日時以前のメッセージ（ISO 8601）
 * @param options.inclusive - since/until の境界を結果に含めるか（省略時は traQ 側の既定に従う）。
 *   ある投稿を起点に「それより前後」を取るときは false を渡し、起点自身の重複取得を避ける。
 * @param options.order - 昇順/降順（'asc' または 'desc'、デフォルト: 'desc'）
 */
export async function getChannelMessages(
    channelId: string,
    {
        limit = 50,
        offset = 0,
        since,
        until,
        inclusive,
        order = 'desc',
    }: ChannelMessagesOptions = {},
): Promise<Message[]> {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (since) params.set('since', since)
    if (until) params.set('until', until)
    if (inclusive !== undefined) params.set('inclusive', String(inclusive))
    params.set('order', order)

    const response = await apiClient.get<Message[]>(
        `${TRAQ_API_BASE}/channels/${channelId}/messages?${params.toString()}`,
    )
    return response.data
}

/**
 * メッセージ詳細を取得する。
 * @param messageId - メッセージID
 */
export async function getMessage(messageId: string): Promise<Message> {
    const response = await apiClient.get<Message>(`${TRAQ_API_BASE}/messages/${messageId}`)
    return response.data
}

interface SearchMessagesOptions {
    /** 投稿者ユーザーUUIDの配列（traQ ID ではなく UUID を渡すこと） */
    from?: string[]
    /** この日時以降に投稿されたメッセージ（ISO 8601） */
    after?: string
    /** この日時以前に投稿されたメッセージ（ISO 8601） */
    before?: string
    /** 取得件数 */
    limit?: number
    /** オフセット */
    offset?: number
    /**
     * ソート順（デフォルトは traQ 側の既定に従う）。
     * 符号の向きが直感と逆なので注意: 'createdAt' が作成日時の新しい順（降順）、
     * '-createdAt' が古い順（昇順）。'updatedAt' 系も同様。
     */
    sort?: 'createdAt' | '-createdAt' | 'updatedAt' | '-updatedAt'
}

/**
 * メッセージを検索する。
 *
 * totalHits は limit/offset を無視した全体のヒット件数なので、
 * 「件数だけ知りたい」場合は limit: 1 を指定すれば十分（hits は使わなくてよい）。
 */
export async function searchMessages({
    from,
    after,
    before,
    limit,
    offset,
    sort,
}: SearchMessagesOptions = {}): Promise<MessageSearchResult> {
    const params = new URLSearchParams()
    for (const userId of from ?? []) {
        params.append('from', userId)
    }
    if (after) params.set('after', after)
    if (before) params.set('before', before)
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    if (sort) params.set('sort', sort)

    const response = await apiClient.get<MessageSearchResult>(
        `${TRAQ_API_BASE}/messages?${params.toString()}`,
    )
    return response.data
}

/**
 * スタンプ一覧を取得する。
 * @param type - 'unicode' または 'original'（省略可）
 */
export async function getStamps(type?: 'unicode' | 'original'): Promise<Stamp[]> {
    const url = type ? `${TRAQ_API_BASE}/stamps?type=${type}` : `${TRAQ_API_BASE}/stamps`
    const response = await apiClient.get<Stamp[]>(url)
    return response.data
}

/**
 * スタンプ画像を取得する（バイナリデータ）。
 * @param stampId - スタンプID
 */
export async function getStampImage(stampId: string): Promise<ArrayBuffer> {
    const response = await apiClient.get(`${TRAQ_API_BASE}/stamps/${stampId}/image`, {
        responseType: 'arraybuffer',
    })
    return response.data
}

/**
 * メッセージにスタンプを押す
 * @param messageId - メッセージID
 * @param stampId - スタンプID
 * 正しいエンドポイント: POST /messages/{messageId}/stamps/{stampId}
 */
export async function pinStamp(messageId: string, stampId: string): Promise<void> {
    await apiClient.post(`${TRAQ_API_BASE}/messages/${messageId}/stamps/${stampId}`)
}

/**
 * メッセージからスタンプを解除する
 * @param messageId - メッセージID
 * @param stampId - スタンプID
 * 正しいエンドポイント: DELETE /messages/{messageId}/stamps/{stampId}
 */
export async function unpinStamp(messageId: string, stampId: string): Promise<void> {
    await apiClient.delete(`${TRAQ_API_BASE}/messages/${messageId}/stamps/${stampId}`)
}

/**
 * メッセージのスタンプ一覧を取得する
 * @param messageId - メッセージID
 */
export async function getMessageStamps(messageId: string): Promise<MessageStamp[]> {
    const response = await apiClient.get<MessageStamp[]>(
        `${TRAQ_API_BASE}/messages/${messageId}/stamps`,
    )
    return response.data
}
/**
 * 添付ファイルのメタ情報を取得する
 * @param fileId - ファイルUUID
 * @returns ファイルメタ情報 (JSON)
 */
export async function getFileMeta(fileId: string): Promise<FileInfo> {
    const response = await apiClient.get<FileInfo>(`${TRAQ_API_BASE}/files/${fileId}/meta`)
    return response.data
}

/**
 * 添付ファイルの実体データを取得する（画像・動画プレビュー用）
 * @param fileId - ファイルUUID
 * @returns ファイルのバイナリデータ (Blob)
 */
export async function getFileContent(fileId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`${TRAQ_API_BASE}/files/${fileId}`, {
        responseType: 'blob',
    })
    return response.data
}

// ============================================
// 4. エクスポート（オブジェクト形式も提供）
// ============================================

export const traqApi = {
    getMe,
    getChannels,
    getChannelMessages,
    getMessage,
    searchMessages,
    getStamps,
    getStampImage,
    pinStamp,
    unpinStamp,
    getUsers,
    getMessageStamps,
    getFileMeta,
    getFileContent,
} as const
