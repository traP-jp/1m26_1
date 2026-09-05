// src/lib/messageListContext.ts
//
// 投稿カード（MessageItem / QuotedMessage / StampList）から、それを並べている一覧
// （TimelineView / MessageDetailView）へ操作を投げるための seam。
//
// emit で中継しないのは、伝えたい相手が常に「直近の親」ではないため。
// StampList は MessageItem → コンテナ → View と 3 段、QuotedMessage に至っては
// QuoteList を挟むうえ本文の描画結果から生えるので、中継を書き足していくと
// 途中のコンポーネントが自分に関係のないイベントを素通しするだけになる。
// 一覧側が provide し、カード側が inject して直接呼ぶ。
import { inject, type InjectionKey } from 'vue'
import type { ApiTimelineMessage } from './api/endpoints'

export interface MessageListContext {
    /**
     * スタンプの楽観的更新の書き戻し先。
     * タイムライン（timelineStore）と詳細ビュー（channelTimelineStore）で
     * 更新すべきストアが異なるため、StampList はストアを直接掴まずここ経由で更新する。
     */
    updateMessageStamps: (messageId: string, stamps: ApiTimelineMessage['stamps']) => void
    /** その投稿を中心にした詳細ビューを開く。 */
    openMessage: (messageId: string) => void
    /** スタンプパレットを、その投稿・その位置で開く。 */
    openPalette: (messageId: string, position: { x: number; y: number }) => void
}

export const messageListContextKey: InjectionKey<MessageListContext> = Symbol('messageListContext')

/**
 * 一覧が provide した context を取り出す。
 * 提供されていない場所で投稿カードを描くのは組み立て間違いなので、黙って無効化せず落とす。
 */
export const useMessageList = (): MessageListContext => {
    const context = inject(messageListContextKey)
    if (!context) {
        throw new Error(
            'messageListContext が provide されていません（投稿カードは TimelineView / MessageDetailView の中でのみ使えます）',
        )
    }
    return context
}
