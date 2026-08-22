<script setup lang="ts">
import TimelineContainer from '../components/timeline/TimelineContainer.vue'
import NewMessageBanner from '../components/timeline/NewMessageBanner.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { useUserStore } from '../stores/userStore'
import { useStampStore } from '../stores/stampStore'
import { useNewMessageStore } from '../stores/newMessageStore'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { initiateLogin, handleOAuthCallback } from '../lib/auth'
import { initializeTimelineMetadata } from '../stores/timelineMetadata'
import { wsManager } from '../lib/websocket'
import { oneMonthonApi } from '../lib/api/endpoints'
import type { traQcomponents } from '../types/traq'
import { traqApi } from '../lib/api/traq.ts'
import type { components } from '../gen/api-types'

type Message = traQcomponents['schemas']['Message']

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

/**
 * 新規投稿作成イベント
 */
const onMessageCreated = (body: { messageCount: number }) => {
    newMessageStore.setCount(body.messageCount)
    newMessageStore.show()
}

/**
 * 投稿削除イベント
 */
const onMessageDeleted = (body: { messageId: string }) => {
    timelineStore.removeMessage(body.messageId)
}

/**
 * 投稿編集イベント
 * 該当メッセージを再取得してストアを更新する
 */
const onMessageEdited = async (body: { messageIds: string[] }) => {
    // 各メッセージを並列で再取得
    const results = await Promise.allSettled(body.messageIds.map((id) => traqApi.getMessage(id)))

    for (const result of results) {
        if (result.status === 'fulfilled') {
            timelineStore.updateMessage(result.value)
        } else {
            console.error('メッセージ再取得に失敗:', result.reason)
        }
    }
}

/**
 * スタンプ更新イベント
 * TODO: 実際のデータ構造に合わせて実装
 */
const onStampUpdated = (body: components['schemas']['StampUpdatedBody']) => {
    // body.stamps に messageId が含まれていないため、現時点では更新不可
    console.warn('StampUpdated イベントを受信しましたが、messageId がないため実装保留', body)
    // TODO: バックエンドと協議し、messageId を追加するか、全メッセージを再取得するか検討
}

/**
 * ユーザー名変更イベント
 */
const onUsernameChanged = (body: components['schemas']['UsernameChangedBody']) => {
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
        const response = await oneMonthonApi.getTimelineNew(timelineStore.sortByPopularity)
        if (response && response.messages.length > 0) {
            // メッセージ詳細を取得
            const results = await Promise.allSettled(
                response.messages.map((id) => traqApi.getMessage(id)),
            )
            const newMessages: Message[] = []
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    newMessages.push(result.value)
                } else {
                    console.error('新着メッセージの詳細取得に失敗:', result.reason)
                }
            }
            if (newMessages.length > 0) {
                timelineStore.prependMessages(newMessages)
                // トップへスクロール
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
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
        console.log(code)
        const result = await handleOAuthCallback(code, state || '')

        if (result.success) {
            await initializeTimeline()
            if (result.redirectTo === '/') {
                setupWebSocket()
            }
            await router.replace({ path: result.redirectTo, query: {} })
        } else {
            authError.value = result.error || '認証に失敗しました'
            isLoading.value = false
            await router.replace({ path: '/', query: {} })
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
        await initiateLogin()
    }
})

onUnmounted(() => {
    // WebSocket イベントハンドラ解除＋切断（モック環境ではスキップ）
    if (import.meta.env.VITE_API_MOCKING !== 'true') {
        wsManager.off('MessageCreated', onMessageCreated)
        wsManager.off('MessageDeleted', onMessageDeleted)
        wsManager.off('MessageEdited', onMessageEdited)
        wsManager.off('StampUpdated', onStampUpdated)
        wsManager.off('UsernameChanged', onUsernameChanged)
        wsManager.off('UserIconReplaced', onUserIconReplaced)
        wsManager.off('StampInfoChanged', onStampInfoChanged)
        wsManager.off('StampImageReplaced', onStampImageReplaced)
        wsManager.disconnect()
    }
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
        <TimelineContainer :messages="timelineStore.messages" />
    </div>
</template>
