// src/stores/messageStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type Message = traQcomponents['schemas']['Message']

/**
 * 引用元メッセージのキャッシュ
 * fileStore と同じ「ID単位キャッシュ + in-flight dedupe」だが、
 * 引用先は削除済み・非公開チャンネルなどで 404 になりやすいため負のキャッシュを持つ
 */
export const useMessageStore = defineStore('message', () => {
    const messages = ref<Map<string, Message>>(new Map())
    /** 取得できないことが確定した ID（4xx、または一時失敗が上限回数に達したもの） */
    const unavailableIds = ref<Set<string>>(new Set())
    const fetchPromises = new Map<string, Promise<void>>()
    /**
     * 一時失敗（5xx / ネットワーク断 / 429）の連続回数。上限で打ち切る。
     * 「失敗して再試行待ち」を UI に出すため（isFailed）リアクティブに持つ
     */
    const transientFailureCounts = ref<Map<string, number>>(new Map())
    const MAX_TRANSIENT_RETRIES = 3

    const fetchMessage = (messageId: string): Promise<void> => {
        if (messages.value.has(messageId)) return Promise.resolve()
        if (unavailableIds.value.has(messageId)) return Promise.resolve()
        const inFlight = fetchPromises.get(messageId)
        if (inFlight) return inFlight

        const promise = traqApi
            .getMessage(messageId)
            .then((message) => {
                messages.value.set(messageId, message)
                transientFailureCounts.value.delete(messageId)
            })
            .catch((error) => {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined
                // 404（存在しない / 削除済み / 不正なUUID）・403（権限なし）・400 は恒久的な失敗。
                // QuoteList の watchEffect が再描画のたびに呼び直すため、二度と取得しにいかない
                if (status === 400 || status === 403 || status === 404) {
                    unavailableIds.value.add(messageId)
                    transientFailureCounts.value.delete(messageId)
                    return
                }
                // ネットワーク断 / 5xx / 429 は一時的な失敗。失敗しても依存は変化せず
                // watchEffect は再実行されないので、自動リトライは期待せず
                // QuoteList に「失敗」を出して再試行はユーザー操作に委ねる。
                // それでも上限まで失敗が積み上がったら恒久的な失敗として打ち切る
                const count = (transientFailureCounts.value.get(messageId) ?? 0) + 1
                transientFailureCounts.value.set(messageId, count)
                if (count >= MAX_TRANSIENT_RETRIES) {
                    unavailableIds.value.add(messageId)
                    transientFailureCounts.value.delete(messageId)
                }
                console.error(`メッセージの取得に失敗: ${messageId}`, error)
            })
            .finally(() => {
                fetchPromises.delete(messageId)
            })

        fetchPromises.set(messageId, promise)
        return promise
    }

    const getMessage = (messageId: string): Message | undefined => messages.value.get(messageId)

    const isUnavailable = (messageId: string): boolean => unavailableIds.value.has(messageId)

    /** 一時的な失敗で取得できていない状態（＝再試行すれば取れる見込みがある） */
    const isFailed = (messageId: string): boolean =>
        transientFailureCounts.value.has(messageId) &&
        !messages.value.has(messageId) &&
        !unavailableIds.value.has(messageId)

    /** ユーザー操作による再試行。失敗回数を戻してから取得し直す */
    const retryMessage = (messageId: string): Promise<void> => {
        transientFailureCounts.value.delete(messageId)
        return fetchMessage(messageId)
    }

    return {
        messages,
        unavailableIds,
        fetchMessage,
        getMessage,
        isUnavailable,
        isFailed,
        retryMessage,
    }
})
