// src/lib/messageAdapter.ts
import type { ApiTimelineMessage } from './api/endpoints'
import type { traQcomponents } from '../types/traq'
import { totalStampCount } from './stamps'

type TraqMessage = traQcomponents['schemas']['Message']

/**
 * traQ の Message を、MessageItem が受け取れる形（＝バックエンドの TimelineMessage）へ寄せる。
 *
 * 両者の差は popularity の有無だけで、stamps の要素型
 * （{stampId, userId, count, createdAt, updatedAt}）は完全に一致している。
 * popularity はバックエンドでの「押下総数」と同じ定義なので、ここで合成できる
 * （timelineStore.updateMessageStamps が同じ計算をしている）。
 */
export const toTimelineMessage = (message: TraqMessage): ApiTimelineMessage => ({
    id: message.id,
    userId: message.userId,
    channelId: message.channelId,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    popularity: totalStampCount(message.stamps),
    stamps: message.stamps,
})
