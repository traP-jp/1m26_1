// src/stores/channelTimelineStore.ts
//
// 投稿詳細ビュー（/messages/:messageId）が表示する「1 チャンネル分の窓」を持つストア。
// timelineStore とは独立している：あちらは全チャンネル横断のタイムラインを新しい順の
// 配列で持つが、こちらはチャット的に読む前提で昇順（古い→新しい）の配列を持ち、
// 上下どちらにも読み足せる。
import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import { useMessageStore } from './messageStore'
import { toTimelineMessage } from '../lib/messageAdapter'
import { applyStampUpdate } from '../lib/stamps'
import type { ApiTimelineMessage } from '../lib/api/endpoints'

/** 初回・追加読み込みとも、一度に取得する件数 */
const WINDOW_LIMIT = 20

/**
 * 窓の上端（older）／下端（newer）の読み足しは、起点と並べ方以外まったく同じ手順を踏む。
 * 違うところだけをこの形にまとめて loadEdge() に渡す。
 */
interface Edge {
    /** ログ用の名前 */
    name: 'older' | 'newer'
    isLoading: Ref<boolean>
    hasMore: Ref<boolean>
    error: Ref<string | null>
    /** 例外が Error でなかったときに出すメッセージ */
    fallbackMessage: string
    /** 読み足しの起点になる投稿。取得を待つ間にここが動いていたら結果は捨てる */
    anchorOf: (list: ApiTimelineMessage[]) => ApiTimelineMessage | undefined
    fetchBatch: (channelId: string, anchorCreatedAt: string) => Promise<ApiTimelineMessage[]>
    merge: (fresh: ApiTimelineMessage[], current: ApiTimelineMessage[]) => ApiTimelineMessage[]
}

export const useChannelTimelineStore = defineStore('channelTimeline', () => {
    // ============================================
    // State
    // ============================================
    /** 昇順（古い→新しい）。timelineStore とは逆順なので使い回さないこと。 */
    const messages = ref<ApiTimelineMessage[]>([])
    const channelId = ref<string | null>(null)
    const centerMessageId = ref<string | null>(null)

    /** 初回表示（中心投稿 + 前後の初期ウィンドウ）の読み込み中か */
    const isLoading = ref(false)
    /** 通信エラー（中心投稿自体の 404/403 等は messageStore.isUnavailable/isFailed 側で判定する） */
    const error = ref<string | null>(null)

    const isLoadingOlder = ref(false)
    const hasMoreOlder = ref(true)
    const loadOlderError = ref<string | null>(null)

    const isLoadingNewer = ref(false)
    const hasMoreNewer = ref(true)
    const loadNewerError = ref<string | null>(null)

    /**
     * 中心投稿への初期スクロール合わせが完了したか。
     * 完了前に上下の先読みが走ると配列が伸びて位置合わせの基準がずれるため、
     * ChannelMessageList 側がこれを見てから先読みを解禁する。
     */
    const isSettled = ref(false)
    /**
     * 「今の中心投稿へもう一度寄せ直してほしい」という要求の通し番号。
     * 表示中の中心投稿を引用しているカードをタップしたときなど、URL が変わらないので
     * ルートの変化では伝えられない。ChannelMessageList がこの値の変化を見る。
     */
    const recenterRequest = ref(0)
    let requestGeneration = 0

    // ============================================
    // Actions
    // ============================================

    const reset = () => {
        messages.value = []
        channelId.value = null
        centerMessageId.value = null
        isLoading.value = false
        error.value = null
        isLoadingOlder.value = false
        hasMoreOlder.value = true
        loadOlderError.value = null
        isLoadingNewer.value = false
        hasMoreNewer.value = true
        loadNewerError.value = null
        isSettled.value = false
    }

    const markSettled = () => {
        isSettled.value = true
    }
    const markUnsettled = () => {
        isSettled.value = false
    }
    const requestRecenter = () => {
        recenterRequest.value++
    }

    /** until より古い側を 1 バッチ取得し、昇順（古い→新しい）に整えて返す */
    const fetchOlderBatch = async (
        targetChannelId: string,
        until: string,
    ): Promise<ApiTimelineMessage[]> => {
        // inclusive: false で until 自身（＝既に持っている境界の投稿）の再取得を避ける。
        // モックはこの引数を見ないので境界が重複して返りうるが、loadEdge が ID の重複除去をする。
        const result = await traqApi.getChannelMessages(targetChannelId, {
            limit: WINDOW_LIMIT,
            until,
            inclusive: false,
            order: 'desc',
        })
        return result.map(toTimelineMessage).reverse()
    }

    /** since より新しい側を 1 バッチ取得する（返り値は既に昇順） */
    const fetchNewerBatch = async (
        targetChannelId: string,
        since: string,
    ): Promise<ApiTimelineMessage[]> => {
        const result = await traqApi.getChannelMessages(targetChannelId, {
            limit: WINDOW_LIMIT,
            since,
            inclusive: false,
            order: 'asc',
        })
        return result.map(toTimelineMessage)
    }

    const olderEdge: Edge = {
        name: 'older',
        isLoading: isLoadingOlder,
        hasMore: hasMoreOlder,
        error: loadOlderError,
        fallbackMessage: '過去の投稿の取得に失敗しました',
        anchorOf: (list) => list[0],
        fetchBatch: fetchOlderBatch,
        // 配列の先頭にだけ足す純粋な prepend。呼び出し元（ChannelMessageList）が
        // 伸びた分を window.scrollBy で相殺してスクロール位置を保つので、
        // ここで並びを崩したり既存の要素を差し替えたりしないこと。
        merge: (fresh, current) => [...fresh, ...current],
    }

    const newerEdge: Edge = {
        name: 'newer',
        isLoading: isLoadingNewer,
        hasMore: hasMoreNewer,
        error: loadNewerError,
        fallbackMessage: '新しい投稿の取得に失敗しました',
        anchorOf: (list) => list[list.length - 1],
        fetchBatch: fetchNewerBatch,
        merge: (fresh, current) => [...current, ...fresh],
    }

    /**
     * messageId を中心にチャンネルタイムラインを開く。
     * 中心投稿を取得して初めて channelId が分かるので、それを待ってから前後を並行取得する。
     */
    const open = async (messageId: string) => {
        const generation = ++requestGeneration
        reset()
        centerMessageId.value = messageId
        isLoading.value = true

        try {
            const messageStore = useMessageStore()
            await messageStore.fetchMessage(messageId)
            // このストアはシングルトンなので、引用を連続でタップするなど open() が
            // 割り込まれた場合、待っている間に別の messageId が中心になっていることがある。
            // その場合は古い方の結果なので、状態を書き換えずに黙って捨てる。
            if (generation !== requestGeneration) return

            const center = messageStore.getMessage(messageId)
            if (!center) {
                // 404/403（恒久）または一時失敗。呼び出し元は messageStore.isUnavailable/isFailed を見て表示を出し分ける
                return
            }

            channelId.value = center.channelId
            const centerTimelineMessage = toTimelineMessage(center)

            const [olderBatch, newerBatch] = await Promise.all([
                fetchOlderBatch(center.channelId, center.createdAt),
                fetchNewerBatch(center.channelId, center.createdAt),
            ])
            if (generation !== requestGeneration) return

            hasMoreOlder.value = olderBatch.length >= WINDOW_LIMIT
            hasMoreNewer.value = newerBatch.length >= WINDOW_LIMIT

            messages.value = [...olderBatch, centerTimelineMessage, ...newerBatch]
        } catch (err) {
            if (generation !== requestGeneration) return
            error.value =
                err instanceof Error ? err.message : 'チャンネルの投稿の取得に失敗しました'
            console.error('channelTimelineStore.open error:', err)
        } finally {
            if (generation === requestGeneration) isLoading.value = false
        }
    }

    /** 窓の片端を 1 バッチぶん読み足す。上下の違いは edge に閉じ込めてある */
    const loadEdge = async (edge: Edge) => {
        const anchor = edge.anchorOf(messages.value)
        if (edge.isLoading.value || !edge.hasMore.value || !channelId.value || !anchor) return

        const generation = requestGeneration
        const targetChannelId = channelId.value
        const anchorId = anchor.id
        edge.isLoading.value = true
        edge.error.value = null

        try {
            const batch = await edge.fetchBatch(targetChannelId, anchor.createdAt)
            // 待っている間に開き直された／同じ端がさらに動いていたら、この結果はもう合わない
            if (
                generation !== requestGeneration ||
                channelId.value !== targetChannelId ||
                edge.anchorOf(messages.value)?.id !== anchorId
            ) {
                return
            }

            // 境界の重複（モックは inclusive を見ないため常に、実 API でもタイムスタンプ衝突時に起こりうる）を弾く
            const known = new Set(messages.value.map((m) => m.id))
            const fresh = batch.filter((m) => !known.has(m.id))

            if (fresh.length === 0) {
                edge.hasMore.value = false
                return
            }

            edge.hasMore.value = batch.length >= WINDOW_LIMIT
            messages.value = edge.merge(fresh, messages.value)
        } catch (err) {
            if (generation !== requestGeneration) return
            edge.error.value = err instanceof Error ? err.message : edge.fallbackMessage
            console.error(`channelTimelineStore.loadEdge(${edge.name}) error:`, err)
        } finally {
            if (generation === requestGeneration) edge.isLoading.value = false
        }
    }

    /** 今表示している中で最も古い投稿より、さらに古い分を読み足す */
    const fetchOlder = () => loadEdge(olderEdge)
    /** 今表示している中で最も新しい投稿より、さらに新しい分を読み足す */
    const fetchNewer = () => loadEdge(newerEdge)

    /** メッセージのスタンプを更新する（messageListContext 経由で StampList から呼ばれる） */
    const updateMessageStamps = (messageId: string, stamps: ApiTimelineMessage['stamps']) => {
        applyStampUpdate(messages.value, messageId, stamps)
    }

    const findMessage = (messageId: string): ApiTimelineMessage | undefined =>
        messages.value.find((m) => m.id === messageId)

    return {
        // State
        messages,
        channelId,
        centerMessageId,
        isLoading,
        error,
        isLoadingOlder,
        hasMoreOlder,
        loadOlderError,
        isLoadingNewer,
        hasMoreNewer,
        loadNewerError,
        isSettled,
        recenterRequest,

        // Actions
        open,
        reset,
        fetchOlder,
        fetchNewer,
        markSettled,
        markUnsettled,
        requestRecenter,
        updateMessageStamps,
        findMessage,
    }
})
