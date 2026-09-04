<script setup lang="ts">
import TimelineContainer from '../components/timeline/TimelineContainer.vue'
import NewMessageBanner from '../components/timeline/NewMessageBanner.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { useUserStore } from '../stores/userStore'
import { useStampStore } from '../stores/stampStore'
import { useNewMessageStore } from '../stores/newMessageStore'
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { messageListContextKey } from '../lib/messageListContext'
import { useAuthStore } from '../stores/authStore'
import { initiateLogin, handleOAuthCallback } from '../lib/auth'
import { initializeTimelineMetadata } from '../stores/timelineMetadata'
import { wsManager } from '../lib/websocket'
import { oneMonthonApi } from '../lib/api/endpoints'
import { traqApi } from '../lib/api/traq.ts'
import { API_CONCURRENCY, mapWithConcurrency } from '../lib/concurrency'
import type { components } from '../gen/api-types'
import StampPalette from '../components/stamp-palette/StampPalette.vue'
import { useStampPalette } from '../composables/useStampPalette'

// KeepAlive の :include で名指しするための名前（App.vue 参照）
defineOptions({ name: 'TimelineView' })

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const timelineStore = useTimelineStore()
const userStore = useUserStore()
const stampStore = useStampStore()
const newMessageStore = useNewMessageStore()

const isLoading = ref(true)
const authError = ref<string | null>(null)

const initializeTimeline = async () => {
    isLoading.value = true
    await Promise.all([
        timelineStore.fetchTimeline(),
        initializeTimelineMetadata().catch((error: unknown) => {
            console.error('タイムライン用メタデータの取得に失敗:', error)
        }),
    ])
    isLoading.value = false
}

// ============================================
// WebSocket イベントハンドラ
// ============================================

// WebSocket の body は網の向こうから来る未検証の値なので、
// 使う前に必ず形を確かめる。ここを省くと、例えば messageIds が無いときに
// mapWithConcurrency の items.length で読み解けないエラーになって落ちる。
const warnUnexpectedBody = (type: string, body: unknown) => {
    console.warn(`WebSocket ${type}: 想定外の body 形式です`, body)
}

/**
 * 新規投稿作成イベント
 */
const onMessageCreated = (body: { messageCount: number }) => {
    if (typeof body?.messageCount !== 'number') {
        warnUnexpectedBody('MessageCreated', body)
        return
    }
    newMessageStore.setCount(body.messageCount)
    newMessageStore.show()
}

/**
 * 投稿削除イベント
 */
const onMessageDeleted = (body: { messageId: string }) => {
    if (typeof body?.messageId !== 'string') {
        warnUnexpectedBody('MessageDeleted', body)
        return
    }
    timelineStore.removeMessage(body.messageId)
}

/**
 * 投稿編集イベント
 * 編集で変わるのは本文だけなので、traQ から本文を引き直して既存の項目に上書きする
 * （スタンプ集計値や popularity はバックエンド由来のものを保つ）
 */
const onMessageEdited = async (body: { messageIds: string[] }) => {
    if (!Array.isArray(body?.messageIds)) {
        warnUnexpectedBody('MessageEdited', body)
        return
    }

    // タイムラインに出ていないメッセージを引きに行っても捨てるだけなので絞る
    const targetIds = body.messageIds.filter((id) =>
        timelineStore.messages.some((m) => m.id === id),
    )
    if (targetIds.length === 0) return

    const results = await mapWithConcurrency(targetIds, API_CONCURRENCY, (id) =>
        traqApi.getMessage(id),
    )

    for (const result of results) {
        if (result.status !== 'fulfilled') {
            console.error('メッセージ再取得に失敗:', result.reason)
            continue
        }
        const fetched = result.value
        const existing = timelineStore.messages.find((m) => m.id === fetched.id)
        if (!existing) continue
        timelineStore.updateMessage({
            ...existing,
            content: fetched.content,
            updatedAt: fetched.updatedAt,
        })
    }
}

/**
 * スタンプ更新イベント
 *
 * body.stamps は (ユーザー, スタンプ) 単位の全件なので、そのまま置き換えるだけでよい。
 *
 * 注意: バックエンドの traQ リレー（backend/internal/handler/traQ_websocket.go）は
 * 現状 body に stamps 配列だけを入れており messageId を送ってこないため、実環境では
 * 下のガードに落ちて何もしない。どのメッセージの更新かはフロントからは判別できないので、
 * 直すのはバックエンド側。ここでは OpenAPI 仕様どおりの body が来た場合を実装しておく。
 */
const onStampUpdated = (body: components['schemas']['StampUpdatedBody']) => {
    if (typeof body?.messageId !== 'string' || !Array.isArray(body?.stamps)) {
        warnUnexpectedBody('StampUpdated', body)
        return
    }
    timelineStore.updateMessageStamps(body.messageId, body.stamps)
}

/**
 * ユーザー名変更イベント
 */
const onUsernameChanged = (body: components['schemas']['UsernameChangedBody']) => {
    if (typeof body?.user?.userId !== 'string') {
        warnUnexpectedBody('UsernameChanged', body)
        return
    }
    const user = userStore.users.get(body.user.id ?? body.user.userId)
    if (user && body.user.name) {
        user.displayName = body.user.name
        userStore.users.set(user.id, user)
    }
}

/**
 * ユーザーアイコン変更イベント
 */
const onUserIconReplaced = (body: { userId: string }) => {
    // 画像プロキシのキャッシュは URL にクエリパラメータを付与して回避する
    // または userStore にキャッシュクリア用のメソッドを追加する
    console.warn('UserIconReplaced イベントを受信しました', body)
    // TODO: アイコンキャッシュのクリア処理（必要に応じて実装）
}

/**
 * スタンプ情報変更イベント（名称）
 */
const onStampInfoChanged = (body: { stampId: string; name: string }) => {
    if (typeof body?.stampId !== 'string' || typeof body?.name !== 'string') {
        warnUnexpectedBody('StampInfoChanged', body)
        return
    }
    const stamp = stampStore.stamps.get(body.stampId)
    if (stamp) {
        stamp.name = body.name
        stampStore.stamps.set(body.stampId, stamp)
    }
}

/**
 * スタンプ画像変更イベント
 */
const onStampImageReplaced = (body: { stampId: string }) => {
    // 画像プロキシのキャッシュ対策として、タイムスタンプを付与する方式に切り替える
    console.warn('StampImageReplaced イベントを受信しました', body)
    // TODO: スタンプ画像キャッシュのクリア処理（必要に応じて実装）
}

const setupWebSocket = () => {
    if (import.meta.env.VITE_API_MOCKING === 'true') {
        return
    }
    wsManager.on('MessageCreated', onMessageCreated)
    wsManager.on('MessageDeleted', onMessageDeleted)
    wsManager.on('MessageEdited', onMessageEdited)
    wsManager.on('StampUpdated', onStampUpdated)
    wsManager.on('UsernameChanged', onUsernameChanged)
    wsManager.on('UserIconReplaced', onUserIconReplaced)
    wsManager.on('StampInfoChanged', onStampInfoChanged)
    wsManager.on('StampImageReplaced', onStampImageReplaced)
    wsManager.connect()
}

/**
 * 新着メッセージ読み込み（バナークリック時）
 */
const handleLoadNewMessages = async () => {
    try {
        // バックエンドが本文まで返すので、そのまま先頭に足せる。
        // 「今持っている中で最も新しい投稿より後」を要求する。
        const response = await oneMonthonApi.getTimelineNew(
            timelineStore.sortByPopularity,
            timelineStore.newestCreatedAt(),
        )
        if (response && response.length > 0) {
            timelineStore.prependMessages(response)
            // トップへスクロール（スクローラは page-mode なのでページごと動かす）
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    } catch (error) {
        console.error('新着メッセージの取得に失敗:', error)
    } finally {
        newMessageStore.hide()
    }
}

// ============================================
// ライフサイクル
// ============================================

onMounted(async () => {
    const code = route.query.code as string
    const state = route.query.state as string

    // ============================================
    // 1. OAuth コールバック処理（code がある場合）
    // ============================================
    if (code) {
        const result = await handleOAuthCallback(code, state || '')

        if (result.success) {
            await initializeTimeline()
            // 以前は redirectTo === '/' のときだけ接続していたが、/messages/:id への
            // 直リンクからログインした場合 redirectTo はそちらになり、WebSocket が
            // 一生繋がらないままになる。リダイレクト先に関わらず必ず接続する。
            setupWebSocket()
            await router.replace({ path: result.redirectTo, query: {} })
        } else {
            authError.value = result.error || '認証に失敗しました'
            isLoading.value = false
            // ここで router.replace('/') すると、未認証かつ code の無いルートに
            // 遷移してナビゲーションガードが再び initiateLogin() を呼び、
            // 失敗 → リダイレクト → 失敗 …という無限ループになる
            // （traQ 側のレート制限 429 を引き起こした原因）。
            // 使用済みの code をアドレスバーから消すだけに留め、
            // ルーター遷移は発生させない。
            history.replaceState(history.state, '', route.path)
        }
        return
    }

    // ============================================
    // 2. 通常の認証チェック（code がない場合）
    // ============================================
    if (authStore.isAuthenticated) {
        await initializeTimeline()

        setupWebSocket()
        // onMounted 内の WebSocket 接続スキップ部分の直後に追加
        if (import.meta.env.VITE_API_MOCKING === 'true') {
            // 3秒後に新着が「ある」という状態だけをセットする（APIは叩かない）
            setTimeout(() => {
                // デバッグ用：新着が3件あると仮定
                newMessageStore.setCount(3)
                newMessageStore.show()
            }, 500)
        }
    } else {
        sessionStorage.setItem('login_redirect', route.fullPath)
        try {
            await initiateLogin()
        } catch (error) {
            // サーキットブレーカーが働いた場合など、ここに来る。
            // traQ への再リダイレクトはせず、理由を表示して止まる。
            authError.value =
                error instanceof Error ? error.message : 'ログインを開始できませんでした。'
            isLoading.value = false
        }
    }
})

onUnmounted(() => {
    // WebSocket イベントハンドラ解除＋切断（モック環境ではスキップ）
    if (import.meta.env.VITE_API_MOCKING === 'true') {
        return
    }
    wsManager.off('MessageCreated', onMessageCreated)
    wsManager.off('MessageDeleted', onMessageDeleted)
    wsManager.off('MessageEdited', onMessageEdited)
    wsManager.off('StampUpdated', onStampUpdated)
    wsManager.off('UsernameChanged', onUsernameChanged)
    wsManager.off('UserIconReplaced', onUserIconReplaced)
    wsManager.off('StampInfoChanged', onStampInfoChanged)
    wsManager.off('StampImageReplaced', onStampImageReplaced)
    wsManager.disconnect()
})

// ============================================
// スタンプパレット管理
// ============================================
const { isPaletteOpen, palettePosition, openPalette, closePalette, selectStamp } = useStampPalette({
    findMessage: (messageId) => timelineStore.messages.find((message) => message.id === messageId),
    updateMessageStamps: timelineStore.updateMessageStamps,
    onAdd: (_messageId, stampId, stamps) => {
        const userId = authStore.userId
        if (
            userId &&
            !stamps.some((stamp) => stamp.stampId === stampId && stamp.userId === userId)
        ) {
            timelineStore.triggerAddStampAnimation(stampId)
        }
    },
})

// 投稿カードから飛んでくる操作の受け口。カードは階層が深く emit で中継しきれないので
// provide で渡す（MessageDetailView も同じ形で、書き戻し先のストアだけが違う）。
provide(messageListContextKey, {
    updateMessageStamps: timelineStore.updateMessageStamps,
    openMessage: (messageId: string) =>
        router.push({ name: 'message-detail', params: { messageId } }),
    openPalette,
})
</script>

<template>
    <!-- ローディング中 -->
    <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>認証処理中...</p>
    </div>
    <div v-else-if="authError">{{ authError }}</div>
    <!-- タイムライン表示 -->
    <div v-else>
        <NewMessageBanner @load-new-messages="handleLoadNewMessages" />
        <TimelineContainer />
    </div>

    <StampPalette
        v-model="isPaletteOpen"
        @select="selectStamp"
        @close="closePalette"
        :position="palettePosition"
    />
</template>
