// src/stores/messageStampStore.ts
//
// バックエンドの /api/timeline が返すスタンプは集計済み（{superior: [{id, count}], othersCount}）で、
// 「誰が押したか」の情報を持たない。しかし UI は
//   - 自分が押したスタンプのハイライト（StampList の isPinned）
//   - 誰が押したかのツールチップ（StampTooltip の entries）
// にユーザー単位の情報を必要とする。
//
// そこで、表示されたメッセージについてだけ traQ の
// GET /messages/{id}/stamps を遅延取得してここにキャッシュする。
// タイムラインは仮想化されているので、実際に取りに行くのは画面内のメッセージだけになる。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import { API_CONCURRENCY } from '../lib/concurrency'
import { aggregateFromDetail } from '../lib/stamps'
import { useTimelineStore } from './timelineStore'
import type { traQcomponents } from '../types/traq'

type MessageStamp = traQcomponents['schemas']['MessageStamp']

// 高速スクロール時に大量の ensureStamps が一度に積まれても、
// 同時に飛ぶリクエストを API_CONCURRENCY 本までに抑えるための軽量セマフォ。
// mapWithConcurrency は配列一括処理用なので、逐次 enqueue できるこちらを使う。
const waiters: (() => void)[] = []
let running = 0

function acquire(): Promise<void> {
    if (running < API_CONCURRENCY) {
        running += 1
        return Promise.resolve()
    }
    return new Promise((resolve) => {
        waiters.push(() => {
            running += 1
            resolve()
        })
    })
}

function release(): void {
    running -= 1
    waiters.shift()?.()
}

export const useMessageStampStore = defineStore('messageStamp', () => {
    // messageId → そのメッセージの (ユーザー, スタンプ) ごとのエントリ
    const details = ref<Map<string, MessageStamp[]>>(new Map())
    // 取得中のリクエスト。再入を防ぐだけなのでリアクティブにしない。
    const inFlight = new Map<string, Promise<void>>()

    /**
     * ユーザー単位のスタンプ詳細を返す。未取得なら undefined。
     */
    const getStamps = (messageId: string): MessageStamp[] | undefined =>
        details.value.get(messageId)

    /**
     * 取得済みかどうかに関わらず取り直す（他人の操作を WebSocket で知らされたとき用）。
     * 新しい値が届くまでは古い値を表示したままにして、ちらつきを避ける。
     */
    const refreshStamps = (messageId: string): Promise<void> => {
        const existing = inFlight.get(messageId)
        if (existing) return existing

        const task = (async () => {
            await acquire()
            try {
                details.value.set(messageId, await traqApi.getMessageStamps(messageId))
            } catch (error) {
                // 取得できなくても集計値での描画は続くので、握りつぶして warn に留める
                console.warn('スタンプ詳細の取得に失敗:', messageId, error)
            } finally {
                release()
                inFlight.delete(messageId)
            }
        })()

        inFlight.set(messageId, task)
        return task
    }

    /**
     * ユーザー単位のスタンプ詳細を取得する（取得済み・取得中なら何もしない）。
     */
    const ensureStamps = (messageId: string): Promise<void> =>
        details.value.has(messageId) ? Promise.resolve() : refreshStamps(messageId)

    /**
     * 詳細を差し替え、timelineStore が持つ集計値も同じ内容へ揃える。
     *
     * 詳細が真の値で、タイムライン側の集計値はその写し。両者を別々に更新すると
     * ずれるので、必ずここを通す。楽観的更新にもロールバックにも使える
     * （更新前の詳細をそのまま渡せば元に戻る）。
     */
    const commitDetail = (messageId: string, detail: MessageStamp[]): void => {
        details.value.set(messageId, detail)
        useTimelineStore().updateMessageStamps(messageId, aggregateFromDetail(detail))
    }

    return { details, getStamps, ensureStamps, refreshStamps, commitDetail }
})
