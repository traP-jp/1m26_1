<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { DynamicScrollerExposed } from 'vue-virtual-scroller'
import MessageItem from './MessageItem.vue'
import { useChannelTimelineStore } from '../../stores/channelTimelineStore'
import { prependPreservingScroll, waitUntilStable } from '../../lib/scrollAnchor'
import type { ApiTimelineMessage } from '../../lib/api/endpoints'

const store = useChannelTimelineStore()

// 端からこの件数手前に来たら、次の分の先読みを始める（front/infiniteScroll と同じ考え方）
const PREFETCH_THRESHOLD = 5
/** 中心投稿がこれ以内に収まっていれば「寄せ終わった」とみなす */
const ALIGN_TOLERANCE_PX = 2

const scrollerRef = ref<DynamicScrollerExposed<ApiTimelineMessage> | null>(null)

// prependPreservingScroll 自身が window.scrollBy でスクロールを起こすと、それだけで
// @update が再発火する。実測がまだ落ち着いていない間に次の fetchOlder を重ねて
// 呼ぶと、2つの補正ループが scrollHeight の読み取りを取り合って暴れるので、
// 1つの prepend サイクルが終わるまでは新たに始めない。
const isPrepending = ref(false)
let prependController: AbortController | undefined
let settleController: AbortController | undefined

function handleScrollerUpdate(viewStartIndex: number, viewEndIndex: number): void {
    if (store.messages.length === 0) return
    // 初期スクロール（中心投稿への位置合わせ）中に読み足すと、寄せている最中に
    // 配列が伸びて位置合わせの基準がずれるので、落ち着くまでは先読みしない
    if (!store.isSettled) return

    if (viewStartIndex <= PREFETCH_THRESHOLD && !isPrepending.value && !store.loadOlderError) {
        isPrepending.value = true
        prependController = new AbortController()
        const controller = prependController
        prependPreservingScroll(() => store.fetchOlder(), controller.signal).finally(() => {
            if (prependController === controller) {
                prependController = undefined
                isPrepending.value = false
            }
        })
    }
    if (viewEndIndex >= store.messages.length - 1 - PREFETCH_THRESHOLD && !store.loadNewerError) {
        store.fetchNewer()
    }
}

/**
 * 中心投稿を画面中央へ寄せる。
 * 開いた直後は本文の Markdown 解析・引用/添付の描画・スタンプのハイドレートで
 * 高さが後から伸びるため、一度合わせて終わりにはせず、実測が落ち着くまで追従する。
 */
async function settleScroll(messageId: string, signal: AbortSignal): Promise<void> {
    await nextTick()
    if (signal.aborted) return
    // 中心投稿が窓に入っていない（取得に失敗した等）。寄せる先が無いので追従しない
    if (!store.messages.some((message) => message.id === messageId)) return

    await waitUntilStable(() => {
        // 仮想化されているので、DOM に出ているとは限らない
        const target = Array.from(document.querySelectorAll<HTMLElement>('[data-message-id]')).find(
            (element) => element.dataset.messageId === messageId,
        )

        if (!target) {
            // まだ描かれていない。スクローラに index で寄せてもらってから測り直す
            const index = store.messages.findIndex((message) => message.id === messageId)
            if (index >= 0) scrollerRef.value?.scrollToItem(index, { align: 'center' })
            return false
        }

        const viewportCenter = window.innerHeight / 2
        const targetCenter = target.getBoundingClientRect().top + target.offsetHeight / 2
        if (Math.abs(targetCenter - viewportCenter) <= ALIGN_TOLERANCE_PX) return true

        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
        return false
    }, signal)

    if (!signal.aborted) store.markSettled()
}

// store.open() の完了だけでなく、中心 ID とメッセージ窓の反映も監視する。
// 未取得の古い投稿を開いた場合は、非同期取得後の配列更新と DynamicScroller の
// 再マウントが別のタイミングになるため、isLoading だけでは位置合わせを取り逃す。
// recenterRequest は「URL は変わらないが中心へ寄せ直してほしい」という要求
// （表示中の中心投稿を引用しているカードのタップ）。
watch(
    [
        () => store.isLoading,
        () => store.centerMessageId,
        () => store.recenterRequest,
        () => store.messages.length,
    ],
    ([isLoading, messageId, recenterRequest], previous) => {
        if (isLoading || !messageId) {
            // 開き直し中。走っている位置合わせは基準ごと変わるので止める
            settleController?.abort()
            settleController = undefined
            return
        }
        const centerChanged = messageId !== previous?.[1]
        const loadingFinished = previous?.[0] === true
        const recenterRequested = recenterRequest !== previous?.[2]
        if (!centerChanged && !loadingFinished && !recenterRequested && store.isSettled) return

        settleController?.abort()
        const controller = new AbortController()
        settleController = controller
        store.markUnsettled()
        void settleScroll(messageId, controller.signal)
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    settleController?.abort()
    prependController?.abort()
})
</script>

<template>
    <section class="channel-message-list" aria-label="チャンネルの投稿">
        <div v-if="store.isLoading" class="state-message">読み込み中...</div>

        <div v-else-if="store.error" class="state-message error">
            {{ store.error }}
        </div>

        <DynamicScroller
            v-else
            ref="scrollerRef"
            :items="store.messages"
            :min-item-size="120"
            key-field="id"
            page-mode
            :emit-update="true"
            @update="handleScrollerUpdate"
        >
            <!-- 古い側（配列の先頭 = 上）のインジケータ -->
            <template #before>
                <div class="list-edge" aria-live="polite">
                    <span v-if="store.isLoadingOlder">過去の投稿を読み込み中...</span>
                    <span v-else-if="store.loadOlderError" class="list-edge__error">
                        <span>{{ store.loadOlderError }}</span>
                        <button type="button" @click="store.fetchOlder()">再試行</button>
                    </span>
                    <span v-else-if="!store.hasMoreOlder">これより前の投稿はありません</span>
                </div>
            </template>

            <template #default="{ item, index, active }">
                <DynamicScrollerItem
                    :item="item"
                    :active="active"
                    :data-index="index"
                    :data-message-id="item.id"
                >
                    <MessageItem :message="item" :is-center="item.id === store.centerMessageId" />
                </DynamicScrollerItem>
            </template>

            <!-- 新しい側（配列の末尾 = 下）のインジケータ -->
            <template #after>
                <div class="list-edge" aria-live="polite">
                    <span v-if="store.isLoadingNewer">新しい投稿を読み込み中...</span>
                    <span v-else-if="store.loadNewerError" class="list-edge__error">
                        <span>{{ store.loadNewerError }}</span>
                        <button type="button" @click="store.fetchNewer()">再試行</button>
                    </span>
                    <span v-else-if="!store.hasMoreNewer">これより新しい投稿はありません</span>
                </div>
            </template>
        </DynamicScroller>
    </section>
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
.list-edge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    padding: 16px 0;
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--text-size-s);
}
.list-edge__error {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-negative);
}
.list-edge__error button {
    padding: 2px 10px;
    border: 1px solid var(--surface-border-primary);
    border-radius: 6px;
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--text-size-s);
    cursor: pointer;
}
</style>
