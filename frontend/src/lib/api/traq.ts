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

// ============================================
// 3. traQ API クライアント関数
// ============================================

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
 * メッセージにスタンプを押す。
 * @param stampId - スタンプID
 * @param messageId - メッセージID
 */
export async function pinStamp(stampId: string, messageId: string): Promise<void> {
    await apiClient.post(`${TRAQ_API_BASE}/stamps/${stampId}/pin`, { messageId })
}

/**
 * メッセージからスタンプを解除する。
 * @param stampId - スタンプID
 * @param messageId - メッセージID
 */
export async function unpinStamp(stampId: string, messageId: string): Promise<void> {
    await apiClient.delete(`${TRAQ_API_BASE}/stamps/${stampId}/pin?messageId=${messageId}`)
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
} as const
