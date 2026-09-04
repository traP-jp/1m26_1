<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../stores/profileStore'
import { useProfilePostsStore } from '../stores/profilePostsStore'
import { initializeTimelineMetadata } from '../stores/timelineMetadata'
import { traqIconUrl } from '../lib/icons'
import { getAvatarAccentColor } from '../lib/avatarColor'
import { messageListContextKey } from '../lib/messageListContext'
import { useStampPalette } from '../composables/useStampPalette'
import MessageBody from '../components/timeline/MessageBody.vue'
import MessageItem from '../components/timeline/MessageItem.vue'
import StampPalette from '../components/stamp-palette/StampPalette.vue'

const router = useRouter()
const profileStore = useProfileStore()
const profilePostsStore = useProfilePostsStore()

// 直リンクで開かれた場合は履歴が無いのでタイムラインへ（MessageDetailView.vue と同じ形）
const goBack = () => {
    if (window.history.state?.back != null) {
        router.back()
    } else {
        router.push('/')
    }
}

const formatCount = (value: number | null): string =>
    value === null ? '—' : value.toLocaleString('ja-JP')

const formatDelta = (value: number | null): string => {
    if (value === null) return ''
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
}

// ============================================
// タブ切り替え（記録／投稿）
// ============================================
const menuEl = ref<HTMLElement | null>(null)
const recordsTab = ref<HTMLElement | null>(null)
const postsTab = ref<HTMLElement | null>(null)
const offset = ref(0)
const activeTab = ref<'records' | 'posts'>('records')
const startLeft = ref(0)

const measureTabs = () => {
    const m = menuEl.value?.getBoundingClientRect()
    const r = recordsTab.value?.getBoundingClientRect()
    const p = postsTab.value?.getBoundingClientRect()
    if (!m || !r || !p) return

    offset.value = p.left - r.left
    startLeft.value = r.left - m.left - 7.5
}

// ============================================
// 投稿タブ：MessageItem が要求する context（TimelineView.vue / MessageDetailView.vue と同じ形）
// ============================================
const { isPaletteOpen, palettePosition, openPalette, closePalette, selectStamp } = useStampPalette({
    findMessage: profilePostsStore.findMessage,
    updateMessageStamps: profilePostsStore.updateMessageStamps,
})

provide(messageListContextKey, {
    updateMessageStamps: profilePostsStore.updateMessageStamps,
    openMessage: (messageId: string) =>
        router.push({ name: 'message-detail', params: { messageId } }),
    openPalette,
})

// ============================================
// 投稿タブ：末尾までスクロールしたら自動で読み足す（TimelineContainer.vue の
// prefetch と違い仮想化していないので、単純に末尾の目印を IntersectionObserver で見る）
// ============================================
const loadMoreSentinel = ref<HTMLElement | null>(null)
const loadMoreObserver = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return
    // エラー時は自動再試行せずボタンに委ねる（TimelineContainer.vue と同じ方針）
    if (
        profilePostsStore.isLoadingMore ||
        !profilePostsStore.hasMore ||
        profilePostsStore.loadMoreError
    ) {
        return
    }
    profilePostsStore.fetchMore()
})

// 目印は v-if/v-else-if の分岐（読み込み中→一覧）で作り直されるので、要素そのものを
// watch して観測対象を張り替える（onMounted 1 回だけでは初回表示時に間に合わない）。
watch(loadMoreSentinel, (el, previousEl) => {
    if (previousEl) loadMoreObserver.unobserve(previousEl)
    if (el) loadMoreObserver.observe(el)
})

// ============================================
// ライフサイクル
// ============================================
onMounted(() => {
    initializeTimelineMetadata().catch((error: unknown) => {
        console.error('タイムライン用メタデータの取得に失敗:', error)
    })
    profileStore.fetchProfile()
    profilePostsStore.fetchInitial()
})

onUnmounted(() => {
    loadMoreObserver.disconnect()
})

// 「記録／投稿」の下線位置はタブ要素の実測が要るので、プロフィール本体が
// 描画されてから測る（v-else-if の直後は DOM がまだ無い）。
watch(
    () => profileStore.me,
    async (me) => {
        if (!me) return
        await nextTick()
        measureTabs()
    },
)

// ============================================
// ヘッダー背景色（Discord のバナーカラーのような、アイコン由来の単色）
// ============================================
const coverColor = ref<string | null>(null)

// 失敗しても致命的ではない（CSS 側の既定色のまま表示される）ので、取得結果を
// そのまま代入するだけでよい。アイコンは名前が変わらない限り同じなので、
// name をキーに watch すれば再計算は起きない。
watch(
    () => profileStore.me?.name,
    async (name) => {
        if (!name) return
        coverColor.value = await getAvatarAccentColor(traqIconUrl(name, 64))
    },
)
</script>

<template>
    <div v-if="profileStore.isLoading && !profileStore.me" class="state-message">読み込み中...</div>
    <div v-else-if="profileStore.error" class="state-message error">
        {{ profileStore.error }}
        <button type="button" @click="profileStore.fetchProfile()">再読み込み</button>
    </div>

    <template v-else-if="profileStore.me">
        <div class="profile-header">
            <div
                class="arrow"
                role="button"
                tabindex="0"
                aria-label="戻る"
                @click="goBack"
                @keydown.enter="goBack"
            >
                <div class="arrow-1"></div>
                <div class="arrow-2"></div>
                <div class="arrow-3"></div>
            </div>
            <div>
                <p class="header-username">{{ profileStore.me.displayName }}</p>
                <p class="header-number-of-posts">
                    {{ formatCount(profileStore.allTimePosts) }}件の投稿
                </p>
            </div>
        </div>

        <div class="profile-image">
            <div class="cover" :style="coverColor ? { background: coverColor } : undefined">
                <img
                    v-if="profileStore.me.name"
                    :src="traqIconUrl(profileStore.me.name, 200)"
                    alt=""
                    class="avatar"
                    referrerpolicy="no-referrer"
                />
                <div v-else class="avatar avatar-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            </div>
        </div>
        <div class="name">
            <p class="user-name">{{ profileStore.me.displayName }}</p>
            <p class="id-of-account">@{{ profileStore.me.name }}</p>
        </div>
        <div class="profile-text">
            <MessageBody :content="profileStore.me.bio" />
        </div>
        <div class="menu" ref="menuEl">
            <div class="menu-records" ref="recordsTab" @click="activeTab = 'records'">
                <p>記録</p>
            </div>
            <div class="menu-posts" ref="postsTab" @click="activeTab = 'posts'">
                <p>投稿</p>
            </div>
            <div
                class="underline"
                :style="{
                    left: `${startLeft}px`,
                    transform: `translateX(${activeTab === 'records' ? 0 : offset}px)`,
                }"
            ></div>
        </div>

        <div v-show="activeTab === 'records'" class="records">
            <h2>直近１週間</h2>
            <div class="two-squares">
                <div class="square">
                    <p class="square-title">投稿数</p>
                    <p class="square-value">{{ formatCount(profileStore.weekPosts) }}</p>
                    <div class="pm" v-if="profileStore.postsDelta !== null">
                        <p :class="profileStore.postsDelta >= 0 ? 'plus' : 'minus'">
                            {{ formatDelta(profileStore.postsDelta) }}
                        </p>
                        <svg
                            v-if="profileStore.postsDelta >= 0"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9.6875 2.5625L1.27083 10.9792C1.11806 11.1319 0.944444 11.2049 0.75 11.1979C0.555556 11.191 0.381944 11.1111 0.229167 10.9583C0.0763889 10.8056 0 10.6285 0 10.4271C0 10.2257 0.0763889 10.0486 0.229167 9.89583L8.625 1.5H4.43563C4.22368 1.5 4.04597 1.42854 3.9025 1.28563C3.75917 1.14271 3.6875 0.965625 3.6875 0.754375C3.6875 0.543125 3.75931 0.364583 3.90292 0.21875C4.04653 0.0729167 4.22451 0 4.43688 0H10.4315C10.6438 0 10.8229 0.0718061 10.9688 0.215417C11.1146 0.359028 11.1875 0.537013 11.1875 0.749374V6.74396C11.1875 6.95632 11.116 7.13542 10.9731 7.28125C10.8302 7.42708 10.6531 7.5 10.4419 7.5C10.2306 7.5 10.0521 7.42833 9.90625 7.285C9.76042 7.14153 9.6875 6.96382 9.6875 6.75187V2.5625Z"
                                fill="#58BF35"
                            />
                        </svg>
                        <svg
                            v-else
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9.6875 8.63586L1.27083 0.219197C1.11806 0.0664196 0.944444 -0.00649738 0.75 0.000447273C0.555556 0.00739193 0.381944 0.0872526 0.229167 0.24003C0.0763889 0.392808 0 0.569892 0 0.77128C0 0.97267 0.0763889 1.14975 0.229167 1.30253L8.625 9.69836H4.43563C4.22368 9.69836 4.04597 9.76982 3.9025 9.91274C3.75917 10.0557 3.6875 10.2327 3.6875 10.444C3.6875 10.6552 3.75931 10.8338 3.90292 10.9796C4.04653 11.1254 4.22451 11.1984 4.43688 11.1984H10.4315C10.6438 11.1984 10.8229 11.1266 10.9688 10.9829C11.1146 10.8393 11.1875 10.6614 11.1875 10.449V4.45441C11.1875 4.24204 11.116 4.06295 10.9731 3.91711C10.8302 3.77128 10.6531 3.69836 10.4419 3.69836C10.2306 3.69836 10.0521 3.77003 9.90625 3.91336C9.76042 4.05684 9.6875 4.23454 9.6875 4.44649V8.63586Z"
                                fill="#F76767"
                            />
                        </svg>
                    </div>
                </div>
                <div class="square">
                    <p class="square-title">もらった<br />スタンプ</p>
                    <p class="square-value">{{ formatCount(profileStore.weekStamps) }}</p>
                    <div class="pm" v-if="profileStore.stampsDelta !== null">
                        <p :class="profileStore.stampsDelta >= 0 ? 'plus' : 'minus'">
                            {{ formatDelta(profileStore.stampsDelta) }}
                        </p>
                        <svg
                            v-if="profileStore.stampsDelta >= 0"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9.6875 2.5625L1.27083 10.9792C1.11806 11.1319 0.944444 11.2049 0.75 11.1979C0.555556 11.191 0.381944 11.1111 0.229167 10.9583C0.0763889 10.8056 0 10.6285 0 10.4271C0 10.2257 0.0763889 10.0486 0.229167 9.89583L8.625 1.5H4.43563C4.22368 1.5 4.04597 1.42854 3.9025 1.28563C3.75917 1.14271 3.6875 0.965625 3.6875 0.754375C3.6875 0.543125 3.75931 0.364583 3.90292 0.21875C4.04653 0.0729167 4.22451 0 4.43688 0H10.4315C10.6438 0 10.8229 0.0718061 10.9688 0.215417C11.1146 0.359028 11.1875 0.537013 11.1875 0.749374V6.74396C11.1875 6.95632 11.116 7.13542 10.9731 7.28125C10.8302 7.42708 10.6531 7.5 10.4419 7.5C10.2306 7.5 10.0521 7.42833 9.90625 7.285C9.76042 7.14153 9.6875 6.96382 9.6875 6.75187V2.5625Z"
                                fill="#58BF35"
                            />
                        </svg>
                        <svg
                            v-else
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9.6875 8.63586L1.27083 0.219197C1.11806 0.0664196 0.944444 -0.00649738 0.75 0.000447273C0.555556 0.00739193 0.381944 0.0872526 0.229167 0.24003C0.0763889 0.392808 0 0.569892 0 0.77128C0 0.97267 0.0763889 1.14975 0.229167 1.30253L8.625 9.69836H4.43563C4.22368 9.69836 4.04597 9.76982 3.9025 9.91274C3.75917 10.0557 3.6875 10.2327 3.6875 10.444C3.6875 10.6552 3.75931 10.8338 3.90292 10.9796C4.04653 11.1254 4.22451 11.1984 4.43688 11.1984H10.4315C10.6438 11.1984 10.8229 11.1266 10.9688 10.9829C11.1146 10.8393 11.1875 10.6614 11.1875 10.449V4.45441C11.1875 4.24204 11.116 4.06295 10.9731 3.91711C10.8302 3.77128 10.6531 3.69836 10.4419 3.69836C10.2306 3.69836 10.0521 3.77003 9.90625 3.91336C9.76042 4.05684 9.6875 4.23454 9.6875 4.44649V8.63586Z"
                                fill="#F76767"
                            />
                        </svg>
                    </div>
                </div>
            </div>
            <h2>全期間</h2>
            <div class="two-squares">
                <div class="square">
                    <p class="square-title">投稿数</p>
                    <p class="square-value">{{ formatCount(profileStore.allTimePosts) }}</p>
                </div>
                <div class="square">
                    <p class="square-title">もらった<br />スタンプ</p>
                    <!-- traQ にはもらったスタンプの全期間集計 API が無く、全投稿を舐めないと
                         出せないため未実装（プロフィール実装計画のスコープ外） -->
                    <p class="square-value">—</p>
                </div>
            </div>
        </div>

        <div v-show="activeTab === 'posts'" class="posts">
            <div v-if="profilePostsStore.isLoading" class="state-message">読み込み中...</div>
            <div v-else-if="profilePostsStore.error" class="state-message error">
                {{ profilePostsStore.error }}
                <button type="button" @click="profilePostsStore.fetchInitial()">再読み込み</button>
            </div>
            <div v-else-if="profilePostsStore.messages.length === 0" class="state-message">
                投稿がありません
            </div>
            <template v-else>
                <MessageItem
                    v-for="message in profilePostsStore.messages"
                    :key="message.id"
                    :message="message"
                />
                <!-- 末尾がここまでスクロールされたら自動で読み足す（下の loadMoreObserver 参照） -->
                <div ref="loadMoreSentinel" class="posts-foot">
                    <span v-if="profilePostsStore.isLoadingMore" class="posts-foot__text">
                        読み込み中...
                    </span>
                    <span v-else-if="profilePostsStore.loadMoreError" class="posts-foot__error">
                        <span>{{ profilePostsStore.loadMoreError }}</span>
                        <button type="button" @click="profilePostsStore.fetchMore()">再試行</button>
                    </span>
                    <span v-else-if="!profilePostsStore.hasMore" class="posts-foot__text">
                        これ以上はありません
                    </span>
                </div>
            </template>
        </div>

        <StampPalette
            v-model="isPaletteOpen"
            :position="palettePosition"
            @select="selectStamp"
            @close="closePalette"
        />
    </template>
</template>

<style scoped>
.state-message {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-secondary);
}
.state-message.error {
    color: var(--text-negative);
}

.arrow {
    transform: scale(0.7);
    margin-right: 20px;
    cursor: pointer;
}
.arrow-1 {
    width: 22px;
    height: 5px;
    background: var(--text-primary);
    border-radius: 9999vw;
    transform: translate(-4px, -1px) rotate(-45deg);
}
.arrow-2 {
    width: 40px;
    height: 5px;
    background: var(--text-primary);
    border-radius: 9999vw;
}
.arrow-3 {
    width: 22px;
    height: 5px;
    background: var(--text-primary);
    border-radius: 9999vw;
    transform: rotate(45deg) translate(-1px, 4px);
}

.profile-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--background);
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
    padding: 0 20px;
}

.profile-header > div {
    flex-shrink: 0; /* 縮まない */
}

.header-username {
    font-weight: bold;
}

.header-number-of-posts {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}

.header-username,
.header-number-of-posts {
    margin: 0;
}

.settings-icon {
    width: 30px;
    height: 30px;
    display: block;
    margin-left: auto;
}

.profile-image {
    margin: 0;
    padding: 0;
}
.cover {
    width: 100%;
    height: 180px;
    background: var(--gray-200);
    position: relative;
}

.avatar {
    position: absolute;
    bottom: -50px;
    left: 20px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--gray-800);
}
.avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-0);
    font-size: 36px;
}
.user-name,
.id-of-account {
    margin: 0;
}

.name {
    padding-left: 20px;
    padding-top: 90px;
}

.user-name {
    font-weight: bold;
    font-size: var(--text-size-l);
}

.id-of-account {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    margin-top: 5px;
}
.profile-text {
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 10px;
}
.profile-text :deep(p) {
    margin: 0;
}
.menu {
    display: flex;
    margin: 0;
    width: 100%;
    height: 60px;
    align-items: center;
    position: relative;
}
.menu p {
    margin: 0;
}

.menu-records,
.menu-posts,
.menu-subscription {
    margin: auto;
    cursor: pointer;
}

.menu-subscription {
    display: flex;
    background: var(--color-primary);
    padding: 7px 9px 7px 9px;
    align-items: center;
    border-radius: 10px;
    cursor: default;
}
.menu-subscription > p {
    color: var(--gray-0);
    text-align: center;
}

.menu-subscription > svg {
    margin-left: 5px;
}

.underline {
    position: absolute;
    bottom: 10px;
    width: 50px;
    height: 3px;
    background: var(--color-primary);
    transition: transform 0.3s;
}

.records h2 {
    margin-left: 20px;
}

.two-squares {
    display: flex;
    gap: 20px;
    justify-content: center;
    padding: 0 20px;
}

.square {
    flex: 1;
    aspect-ratio: 1 / 1;
    border: solid 1px var(--surface-border-primary);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 200px;
}

.square p {
    text-align: center;
    margin: 0;
    font-size: clamp(14px, 4vw, 24px);
}

.square-title {
    font-size: clamp(14px, 4vw, 24px);
    color: var(--text-secondary);
    height: 2.6em;
    line-height: 1.2;
}

.square-value {
    font-size: 40px !important;
    font-weight: bold;
}

.pm {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
}

.plus {
    color: var(--text-positive);
}

.minus {
    color: var(--text-negative);
}

.posts-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    padding: 16px 0 24px;
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--text-size-s);
}
.posts-foot__error {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-negative);
}
.posts-foot__error button {
    padding: 2px 10px;
    border: 1px solid var(--surface-border-primary);
    border-radius: 6px;
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--text-size-s);
    cursor: pointer;
}
.posts-foot__error button:hover {
    background: var(--surface-secondary);
}
</style>
