import { defineStore } from 'pinia'
import { ref } from 'vue'
import { oneMonthonApi } from '../lib/api/endpoints'
import { traqApi } from '../lib/api/traq'
import { API_CONCURRENCY, mapWithConcurrency } from '../lib/concurrency'
import type { traQcomponents } from '../types/traq'

export const useTimelineStore = defineStore('timeline', () => {
    type TraqMessage = traQcomponents['schemas']['Message']
    // ============================================
    // State
    // ============================================
    const messages = ref<TraqMessage[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const sortByPopularity = ref(false)
    const addAnimationStampId = ref<string | null>(null)
    const removeAnimationStampId = ref<string | null>(null)

    // ============================================
    // Getters（必要に応じて追加）
    // ============================================
    const messageCount = () => messages.value.length

    // ============================================
    // Actions
    // ============================================

    /**
     * タイムラインを取得する
     * 1. 1m26_1 API からメッセージIDリストを取得
     * 2. 各IDの詳細を traQ API から取得
     * 3. 成功したものだけを messages に格納
     */
    const fetchTimeline = async () => {
        isLoading.value = true
        error.value = null

        try {
            // 1. IDリストを取得
            const response = await oneMonthonApi.getTimeline(sortByPopularity.value)
            const ids = response.messages

            if (ids.length === 0) {
                messages.value = []
                return
            }

            // 2. 各IDのメッセージ詳細を取得（同時接続数を絞ってレートリミットを回避）
            const results = await mapWithConcurrency(ids, API_CONCURRENCY, (id) =>
                traqApi.getMessage(id),
            )

            // 3. 成功したものだけを収集
            const fetchedMessages: TraqMessage[] = []
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    fetchedMessages.push(result.value)
                } else {
                    console.error('メッセージ詳細の取得に失敗:', result.reason)
                }
            }

            messages.value = fetchedMessages
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'タイムラインの取得に失敗しました'
            console.error('fetchTimeline error:', err)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 並び順を切り替える
     */
    const toggleSort = () => {
        sortByPopularity.value = !sortByPopularity.value
        // 切り替え後に再取得
        fetchTimeline()
    }

    /**
     * メッセージを先頭に追加する（新着用）
     */
    const prependMessages = (newMessages: TraqMessage[]) => {
        messages.value = [...newMessages, ...messages.value]
    }

    /**
     * メッセージを更新する（編集用）
     */
    const updateMessage = (updated: TraqMessage) => {
        const index = messages.value.findIndex((m) => m.id === updated.id)
        if (index !== -1) {
            messages.value[index] = updated
        }
    }

    /**
     * メッセージを削除する
     */
    const removeMessage = (messageId: string) => {
        messages.value = messages.value.filter((m) => m.id !== messageId)
    }

    /**
     * メッセージのスタンプ情報を更新する
     * @param messageId - メッセージID
     * @param stamps - 更新後のスタンプリスト
     */
    const updateMessageStamps = (messageId: string, stamps: TraqMessage['stamps']) => {
        const index = messages.value.findIndex((m) => m.id === messageId)
        if (index !== -1) {
            const message = messages.value[index]
            if (message) {
                message.stamps = stamps
            }
        }
    }

    /**
     * ストアをリセットする
     */
    const reset = () => {
        messages.value = []
        isLoading.value = false
        error.value = null
    }

    // スタンプを追加・削除したときのアニメーションを起動
    const triggerAddStampAnimation = (stampId: string) => {
        addAnimationStampId.value = stampId
        window.setTimeout(() => {
            if (addAnimationStampId.value === stampId) {
                addAnimationStampId.value = null
            }
        }, 200)
    }

    const triggerRemoveStampAnimation = (stampId: string) => {
        removeAnimationStampId.value = stampId
        window.setTimeout(() => {
            if (removeAnimationStampId.value === stampId) {
                removeAnimationStampId.value = null
            }
        }, 200)
    }

    return {
        // State
        messages,
        isLoading,
        error,
        sortByPopularity,
        addAnimationStampId,
        removeAnimationStampId,

        // Getters
        messageCount,

        // Actions
        fetchTimeline,
        toggleSort,
        prependMessages,
        updateMessage,
        removeMessage,
        updateMessageStamps,
        reset,
        triggerAddStampAnimation,
        triggerRemoveStampAnimation,
    }
})
