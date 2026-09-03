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
 * チャンネル一覧を取得する。
 */
export async function getChannels(): Promise<ChannelsResponse> {
    const response = await apiClient.get<ChannelsResponse>(`${TRAQ_API_BASE}/channels`)
    return response.data
}

/**
 * 指定されたチャンネルのメッセージ一覧を取得する。
 * @param channelId - チャンネルID
 * @param limit - 取得件数（デフォルト: 50）
 * @param offset - オフセット（デフォルト: 0）
 * @param since - この日時以降のメッセージ（ISO 8601）
 * @param until - この日時以前のメッセージ（ISO 8601）
 * @param order - 昇順/降順（'asc' または 'desc'、デフォルト: 'desc'）
 */
export async function getChannelMessages(
    channelId: string,
    limit = 50,
    offset = 0,
    since?: string,
    until?: string,
    order: 'asc' | 'desc' = 'desc',
): Promise<Message[]> {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (since) params.set('since', since)
    if (until) params.set('until', until)
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
    getChannels,
    getChannelMessages,
    getMessage,
    getStamps,
    getStampImage,
    pinStamp,
    unpinStamp,
    getUsers,
    getMessageStamps,
    getFileMeta,
    getFileContent,
} as const
