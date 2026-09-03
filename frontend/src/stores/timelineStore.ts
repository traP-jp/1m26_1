import { defineStore } from 'pinia'
import { ref } from 'vue'
import { oneMonthonApi, type ApiTimelineMessage } from '../lib/api/endpoints'

export const useTimelineStore = defineStore('timeline', () => {
    type TimelineMessage = ApiTimelineMessage
    type Stamps = ApiTimelineMessage['stamps']
    // ============================================
    // State
    // ============================================
    const messages = ref<TimelineMessage[]>([])
    const isLoading = ref(false)
    /** 古い分を追加読み込み中か。多重リクエストを防ぐために見る。 */
    const isLoadingMore = ref(false)
    /** さらに古い投稿が残っているか。0 件返ってきたら false になる。 */
    const hasMore = ref(true)
    const error = ref<string | null>(null)
    const sortByPopularity = ref(false)
    const addAnimationStampId = ref<string | null>(null)
    const removeAnimationStampId = ref<string | null>(null)

    // ============================================
    // Getters（必要に応じて追加）
    // ============================================
    const messageCount = () => messages.value.length

    // ページングのカーソルは state に持たず messages から導出する。
    // こうしておくと、新着を先頭に差し込んでも古い方の位置がずれず、
    // 並び替えで messages を空にすれば自動的に「最新から」に戻る。
    //
    // 末尾・先頭を見るのではなく必ず全件の最小/最大を取ること。
    // 人気順のときバックエンドはページ内をスタンプ数で並べ替えて返すので、
    // 「配列の末尾＝最古」は成り立たない。
    const oldestCreatedAt = () =>
        messages.value.reduce<string | undefined>(
            (min, m) => (min === undefined || m.createdAt < min ? m.createdAt : min),
            undefined,
        )

    const newestCreatedAt = () =>
        messages.value.reduce<string | undefined>(
            (max, m) => (max === undefined || m.createdAt > max ? m.createdAt : max),
            undefined,
        )

    // ============================================
    // Actions
    // ============================================

    // 契約が変わったときに undefined.length のような読み取り不能なエラーではなく、
    // 何がおかしいのかが分かる形で落とす。
    const assertMessageArray = (response: unknown, path: string): TimelineMessage[] => {
        if (!Array.isArray(response)) {
            throw new Error(`GET ${path}: 配列が返るはずが ${typeof response}`)
        }
        return response as TimelineMessage[]
    }

    /**
     * タイムラインを最新から取得する（初回表示・並び替え・リセット用）
     *
     * カーソルを渡さないので常に最新から返る。バックエンドが本文とスタンプ集計値まで
     * 含めて返すので、そのまま格納する。（traQ へメッセージ詳細を引き直すファンアウトは不要）
     */
    const fetchTimeline = async () => {
        isLoading.value = true
        error.value = null

        try {
            // before を渡さない = 最新から。
            // ここで「現在時刻」を渡してはいけない。クライアントの時計が遅れていると
            // その分の直近の投稿が黙って消える。
            const response = await oneMonthonApi.getTimeline(sortByPopularity.value)
            messages.value = assertMessageArray(response, '/api/timeline')
            hasMore.value = true
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'タイムラインの取得に失敗しました'
            console.error('fetchTimeline error:', err)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 今表示している中で最も古い投稿より、さらに古い分を読み足す。
     *
     * 無限スクロールのスクロール検出は別実装のため、今のところ呼び出し元は無い。
     * スクロール検出が入ったらここを呼ぶ。
     */
    const fetchOlderMessages = async () => {
        // 読み込み中・打ち止め・そもそも 1 件も無い（= まず fetchTimeline すべき）ときは何もしない
        const before = oldestCreatedAt()
        if (isLoadingMore.value || isLoading.value || !hasMore.value || before === undefined) {
            return
        }

        isLoadingMore.value = true
        error.value = null

        try {
            const response = assertMessageArray(
                await oneMonthonApi.getTimeline(sortByPopularity.value, before),
                '/api/timeline',
            )

            if (response.length === 0) {
                hasMore.value = false
                return
            }

            // 境界のメッセージが重複して返ってきても表示が壊れないように弾く
            const known = new Set(messages.value.map((m) => m.id))
            const fresh = response.filter((m) => !known.has(m.id))
            if (fresh.length === 0) {
                hasMore.value = false
                return
            }

            messages.value = [...messages.value, ...fresh]
        } catch (err) {
            error.value = err instanceof Error ? err.message : '過去の投稿の取得に失敗しました'
            console.error('fetchOlderMessages error:', err)
        } finally {
            isLoadingMore.value = false
        }
    }

    /**
     * 並び順を切り替える
     */
    const toggleSort = () => {
        sortByPopularity.value = !sortByPopularity.value
        // 並び順が変わると別の一覧になるので、一度空にしてから取り直す。
        // messages が空になることでカーソルも消え、最新から取り直しになる。
        messages.value = []
        hasMore.value = true
        fetchTimeline()
    }

    /**
     * メッセージを先頭に追加する（新着用）
     */
    const prependMessages = (newMessages: TimelineMessage[]) => {
        messages.value = [...newMessages, ...messages.value]
    }

    /**
     * メッセージを更新する（編集用）
     */
    const updateMessage = (updated: TimelineMessage) => {
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
     * メッセージのスタンプ集計値を更新する
     * @param messageId - メッセージID
     * @param stamps - 更新後のスタンプ集計値（superior / othersCount）
     */
    const updateMessageStamps = (messageId: string, stamps: Stamps) => {
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
        isLoadingMore.value = false
        hasMore.value = true
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
        isLoadingMore,
        hasMore,
        error,
        sortByPopularity,
        addAnimationStampId,
        removeAnimationStampId,

        // Getters
        messageCount,
        oldestCreatedAt,
        newestCreatedAt,

        // Actions
        fetchTimeline,
        fetchOlderMessages,
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
