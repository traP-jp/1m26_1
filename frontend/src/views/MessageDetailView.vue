<script setup lang="ts">
import { computed, onMounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChannelMessageList from '../components/timeline/ChannelMessageList.vue'
import StampPalette from '../components/stamp-palette/StampPalette.vue'
import { useChannelTimelineStore } from '../stores/channelTimelineStore'
import { useMessageStore } from '../stores/messageStore'
import { useChannelStore } from '../stores/channelStore'
import { initializeTimelineMetadata } from '../stores/timelineMetadata'
import { messageListContextKey } from '../lib/messageListContext'
import { useStampPalette } from '../composables/useStampPalette'

const route = useRoute()
const router = useRouter()
const store = useChannelTimelineStore()
const messageStore = useMessageStore()
const channelStore = useChannelStore()

/**
 * route.params.messageId は string | string[] になりうる（noUncheckedIndexedAccess の
 * 影響で undefined も型に乗る）ので、常に string へ寄せる。
 */
const currentMessageId = computed(() => {
    const value = route.params.messageId
    if (Array.isArray(value)) return value[0] ?? ''
    return value ?? ''
})

// OAuth のコールバックはここには来ない。traQ のリダイレクト先はクライアント登録時に
// 固定されていて（lib/auth.ts）常に "/" に返るため、詳細ビューへの直リンクから
// ログインした場合も TimelineView がコールバックを処理してからここへ replace される。
onMounted(() => {
    initializeTimelineMetadata().catch((error: unknown) => {
        console.error('タイムライン用メタデータの取得に失敗:', error)
    })
})

// 中心投稿を切り替える。初回表示（immediate）と、引用や兄弟投稿のタップで
// 同じ画面のまま別の投稿へ移ったとき（vue-router は同じルートコンポーネントの
// インスタンスを使い回すので onMounted は再発火しない）の両方をこれ一本でまかなう。
watch(
    currentMessageId,
    (messageId) => {
        if (messageId) void store.open(messageId)
    },
    { immediate: true },
)

const goBack = () => {
    // 直リンクで開かれた場合は履歴が無いので、タイムラインへ
    if (window.history.state?.back != null) {
        router.back()
    } else {
        router.push('/')
    }
}

const retry = () => {
    void store.open(currentMessageId.value)
}

const channelName = computed(() =>
    store.channelId ? channelStore.getChannelName(store.channelId) : '',
)

// 中心投稿の恒久的な取得失敗（削除済み・非公開チャンネル等）。messageStore 側の
// 負のキャッシュで判定するので、channelTimelineStore.open() は再試行しにいかない。
const centerUnavailable = computed(
    () =>
        !store.isLoading &&
        store.messages.length === 0 &&
        messageStore.isUnavailable(currentMessageId.value),
)
// 一時的な取得失敗（5xx/429/ネットワーク断）。自動リトライはせず、ボタンに委ねる
const centerFailed = computed(
    () =>
        !store.isLoading &&
        store.messages.length === 0 &&
        messageStore.isFailed(currentMessageId.value),
)

// ============================================
// スタンプパレット（TimelineView.vue の同名処理と同じ形。書き戻し先だけ store が違う）
// ============================================
const { isPaletteOpen, palettePosition, openPalette, closePalette, selectStamp } = useStampPalette({
    findMessage: store.findMessage,
    updateMessageStamps: store.updateMessageStamps,
})

provide(messageListContextKey, {
    updateMessageStamps: store.updateMessageStamps,
    openMessage: (messageId: string) => {
        // 既に中心にある投稿（＝それを引用しているカードのタップ）は、URL を変えても
        // 何も起きないので遷移させず、中心へ寄せ直すよう一覧へ頼むだけにする。
        if (messageId === currentMessageId.value) {
            store.requestRecenter()
            return
        }
        router.push({ name: 'message-detail', params: { messageId } })
    },
    openPalette,
})
</script>

<template>
    <div class="message-detail">
        <header class="message-detail__header">
            <button type="button" class="message-detail__back" aria-label="戻る" @click="goBack">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                    <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
            <span v-if="channelName" class="message-detail__channel">#{{ channelName }}</span>
        </header>

        <div v-if="centerUnavailable" class="message-detail__state">
            <p>この投稿は表示できません（削除されたか、参加していないチャンネルの投稿です）</p>
            <RouterLink to="/">タイムラインへ戻る</RouterLink>
        </div>

        <div v-else-if="centerFailed" class="message-detail__state">
            <p>投稿の取得に失敗しました</p>
            <button type="button" @click="retry">再試行</button>
        </div>

        <ChannelMessageList v-else />

        <StampPalette
            v-model="isPaletteOpen"
            :position="palettePosition"
            @select="selectStamp"
            @close="closePalette"
        />
    </div>
</template>

<style scoped>
.message-detail__header {
    position: sticky;
    /* 詳細ルートでは AppHeader を出さないので、この行が画面上端に貼り付く */
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    /* タイムラインの人気/最新タブと同じ高さにして、行き来しても位置が動かないようにする */
    min-height: var(--header-height);
    padding: 0 16px;
    background: var(--surface-overlay);
    /* -webkit- 付きは書かない。ビルド（lightningcss）が自動で足してくれるうえ、
       手で後ろに並べると標準プロパティの方が重複扱いで削られてしまう */
    backdrop-filter: blur(12px) saturate(180%);
    border-bottom: 1px solid var(--surface-border-secondary);
}
.message-detail__back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    flex-shrink: 0;
}
.message-detail__back:hover {
    background: var(--gray-200);
}
.message-detail__channel {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-size-m);
    font-weight: 600;
    color: var(--text-primary);
}
.message-detail__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 16px;
    text-align: center;
    color: var(--text-secondary);
}
.message-detail__state button {
    padding: 6px 16px;
    border: 1px solid var(--surface-border-primary);
    border-radius: 6px;
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--text-size-s);
    cursor: pointer;
}
</style>
