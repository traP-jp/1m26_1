// src/stores/profilePostsStore.ts
//
// プロフィール画面の「投稿」タブ用の一覧。timelineStore と違い traQ を直接検索する
// （自分の投稿だけを追うのでバックエンドの /api/timeline を経由する必要がない）。
// 状態の持ち方・追加読み込みの流儀は timelineStore.ts を踏襲している。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import { applyStampUpdate } from '../lib/stamps'
import { toTimelineMessage } from '../lib/messageAdapter'
import { useAuthStore } from './authStore'
import type { ApiTimelineMessage } from '../lib/api/endpoints'

const PAGE_SIZE = 30

export const useProfilePostsStore = defineStore('profilePosts', () => {
    type MessageStamps = ApiTimelineMessage['stamps']

    const messages = ref<ApiTimelineMessage[]>([])
    const isLoading = ref(false)
    /** 追加読み込み中か。多重リクエストを防ぐために見る。 */
    const isLoadingMore = ref(false)
    /** さらに古い投稿が残っているか。0 件返ってきたら false になる。 */
    const hasMore = ref(true)
    const error = ref<string | null>(null)
    const loadMoreError = ref<string | null>(null)

    /**
     * 自分の投稿一覧を最新から取得する（初回表示・リセット用）。
     */
    const fetchInitial = async () => {
        isLoading.value = true
        error.value = null
        loadMoreError.value = null

        const authStore = useAuthStore()
        // accessToken は localStorage から同期復元されるが userId は非同期取得のため、
        // 直接 URL 遷移した直後は authStore.userId がまだ null なことがある。
        // ensureUserId() で解決を待ってから使う（profileStore.fetchProfile と同じ理由）。
        const userId = await authStore.ensureUserId()
        if (!userId) {
            error.value = 'ユーザー情報が取得できていません（未ログイン）'
            isLoading.value = false
            return
        }

        try {
            const result = await traqApi.searchMessages({
                from: [userId],
                sort: 'createdAt',
                limit: PAGE_SIZE,
                offset: 0,
            })
            messages.value = result.hits.map(toTimelineMessage)
            hasMore.value = result.hits.length === PAGE_SIZE
        } catch (err) {
            error.value = err instanceof Error ? err.message : '投稿の取得に失敗しました'
            console.error('fetchInitial error:', err)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 今表示している分より後ろ（offset 続き）を読み足す。
     */
    const fetchMore = async () => {
        if (isLoadingMore.value || isLoading.value || !hasMore.value) return

        const authStore = useAuthStore()
        const userId = await authStore.ensureUserId()
        if (!userId) return

        isLoadingMore.value = true
        loadMoreError.value = null

        try {
            const result = await traqApi.searchMessages({
                from: [userId],
                sort: 'createdAt',
                limit: PAGE_SIZE,
                offset: messages.value.length,
            })

            if (result.hits.length === 0) {
                hasMore.value = false
                return
            }

            messages.value = [...messages.value, ...result.hits.map(toTimelineMessage)]
            hasMore.value = result.hits.length === PAGE_SIZE
        } catch (err) {
            loadMoreError.value =
                err instanceof Error ? err.message : '過去の投稿の取得に失敗しました'
            console.error('fetchMore error:', err)
        } finally {
            isLoadingMore.value = false
        }
    }

    /**
     * メッセージのスタンプを更新する（楽観的更新・スタンプパレットからの書き戻し用）
     */
    const updateMessageStamps = (messageId: string, stamps: MessageStamps) => {
        applyStampUpdate(messages.value, messageId, stamps)
    }

    const findMessage = (messageId: string): ApiTimelineMessage | undefined =>
        messages.value.find((m) => m.id === messageId)

    const reset = () => {
        messages.value = []
        isLoading.value = false
        isLoadingMore.value = false
        hasMore.value = true
        error.value = null
        loadMoreError.value = null
    }

    return {
        messages,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        loadMoreError,
        fetchInitial,
        fetchMore,
        updateMessageStamps,
        findMessage,
        reset,
    }
})
