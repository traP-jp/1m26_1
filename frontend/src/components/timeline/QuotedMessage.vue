<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useChannelStore } from '../../stores/channelStore'
import { formatDate } from '../../lib/dateFormatter'
import MessageBody from './MessageBody.vue'
import type { traQcomponents } from '../../types/traq'

const props = defineProps<{ message: traQcomponents['schemas']['Message'] }>()

const userStore = useUserStore()
const channelStore = useChannelStore()

const iconUrl = computed(() => userStore.getIconUrl(props.message.userId))
const displayName = computed(() => userStore.getUserName(props.message.userId))
const userName = computed(() => userStore.getUser(props.message.userId)?.name ?? '')
const channelName = computed(() => channelStore.getChannelName(props.message.channelId))

// 引用の中に引用が含まれる場合、再帰させず「引用メッセージ」という静的表示に留める（深さ1で打ち切り）
// 内側の @attachments は意図的に購読しない：流し読みされるだけのカードで
// 画像/動画/音声の実体データを取得しに行くのは重く、クランプも崩れるため
const nestedQuoteCount = ref(0)

const isExpanded = ref(false)
const isOverflowing = ref(false)
const bodyRef = ref<HTMLElement | null>(null)

const measureOverflow = () => {
    const el = bodyRef.value
    if (!el) return
    // 展開中に測ると（クランプが外れ scrollHeight === clientHeight になり）
    // isOverflowing が false に落ちて折りたたむ手段を失うので測らない
    if (isExpanded.value) return
    isOverflowing.value = el.scrollHeight > el.clientHeight + 1
}

let observer: ResizeObserver | undefined
onMounted(() => {
    observer = new ResizeObserver(() => measureOverflow())
    if (bodyRef.value) observer.observe(bodyRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

watch(
    () => props.message.content,
    async () => {
        isExpanded.value = false
        await nextTick()
        measureOverflow()
    },
)
</script>

<template>
    <article class="quote-card">
        <header class="quote-header">
            <img
                v-if="iconUrl"
                :src="iconUrl"
                alt=""
                class="quote-avatar"
                referrerpolicy="no-referrer"
            />
            <span v-else class="quote-avatar quote-avatar--placeholder" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
                    />
                </svg>
            </span>
            <span class="quote-display-name">{{ displayName }}</span>
            <span v-if="userName" class="quote-user-id">@{{ userName }}</span>
            <time class="quote-timestamp" :datetime="message.createdAt">{{
                formatDate(message.createdAt)
            }}</time>
        </header>
        <div class="quote-channel">#{{ channelName }}</div>

        <div class="quote-body-wrapper">
            <div ref="bodyRef" class="quote-body" :class="{ 'is-expanded': isExpanded }">
                <!-- 引用の入れ子は深さ1で打ち切る。ここに QuoteList は絶対に置かない -->
                <MessageBody
                    :content="message.content"
                    @quotes="(ids) => (nestedQuoteCount = ids.length)"
                />
                <!-- 引用元が複数の引用を含む場合、その数だけプレースホルダを並べる -->
                <p v-for="n in nestedQuoteCount" :key="n" class="quote-nested">引用メッセージ</p>
            </div>

            <!-- クランプ中だけ本文末尾に重ねる装飾。展開時は隠す行がないので出さない -->
            <div v-if="isOverflowing && !isExpanded" class="quote-fade" aria-hidden="true"></div>
        </div>

        <!-- ボタンは本文に重ねず通常フローに置く（重ねると展開時に最終行を覆ってしまう） -->
        <button
            v-if="isOverflowing"
            type="button"
            class="quote-expand"
            @click="isExpanded = !isExpanded"
        >
            {{ isExpanded ? '折りたたむ' : '全文を表示する' }}
        </button>
    </article>
</template>

<style scoped>
.quote-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px;
    background: var(--gray-0);
    border: 1px solid var(--surface-border-secondary);
    border-radius: 12px;
}

.quote-header {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.quote-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.quote-avatar--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gray-300);
    color: var(--text-secondary);
}

.quote-avatar--placeholder svg {
    width: 16px;
    height: 16px;
}

.quote-display-name {
    flex-shrink: 0;
    font-weight: 600;
    font-size: var(--text-size-s);
    color: var(--text-primary);
    white-space: nowrap;
}

.quote-user-id {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}

.quote-timestamp {
    flex-shrink: 0;
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    white-space: nowrap;
}

.quote-channel {
    /* 親の gap 分を打ち消して、ヘッダー行にぎりぎりまで詰める */
    margin-top: -6px;
    margin-bottom: 4px;
    margin-left: 28px;
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.quote-body {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    overflow: hidden;
    font-size: var(--text-size-s);
    line-height: 1.5;
    color: var(--text-primary);
}

.quote-body.is-expanded {
    display: block;
    -webkit-line-clamp: unset;
    line-clamp: unset;
    overflow: visible;
}

.quote-body :deep(h1),
.quote-body :deep(h2),
.quote-body :deep(h3),
.quote-body :deep(h4) {
    font-size: var(--text-size-m);
    margin: 0.2em 0;
}

.quote-body :deep(p) {
    margin-top: 0.3em;
}

.quote-body :deep(img) {
    max-width: 100%;
    max-height: 120px;
}

.quote-body :deep(> :first-child) {
    margin-top: 0;
}

.quote-body :deep(> :last-child) {
    margin-bottom: 0;
}

.quote-nested {
    margin-top: 4px;
    padding: 0 0 0 8px;
    border-left: 3px solid #dfe2e5;
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}

.quote-body-wrapper {
    position: relative;
}

/* クランプで隠れる最後の1〜2行の上に、カード背景へフェードするグラデーションを重ねる */
.quote-fade {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 1em;
    background: linear-gradient(to bottom, transparent, var(--gray-0) 65%);
    pointer-events: none; /* 本文選択の邪魔をしない純粋な装飾 */
}

.quote-expand {
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: var(--text-size-s);
    font-weight: 600;
    color: var(--color-primary);
}
.quote-expand:hover {
    background: var(--gray-200);
}
</style>
