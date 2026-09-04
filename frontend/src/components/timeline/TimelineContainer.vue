<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import { useTimelineStore } from '../../stores/timelineStore'
import SkeletonMessage from './SkeletonMessage.vue'

const store = useTimelineStore()

// 末尾からこの件数手前に来たら、古い投稿の先読みを始める
const PREFETCH_THRESHOLD = 8

/**
 * DynamicScroller の @update（emit-update を有効にしたときだけ発火する）。
 * 引数は (viewStartIndex, viewEndIndex, visibleStartIndex, visibleEndIndex)。
 * バッファ込みの描画末尾（viewEndIndex）がリスト末尾に近づいたら古い分を読み足す。
 */
function handleScrollerUpdate(_viewStartIndex: number, viewEndIndex: number): void {
    if (store.messages.length === 0) return
    // 再入・打ち止めはストア側もガードするが、失敗後に自動で叩き続けないよう loadMoreError も見る
    if (store.isLoadingMore || !store.hasMore || store.loadMoreError) return
    if (viewEndIndex >= store.messages.length - PREFETCH_THRESHOLD) {
        store.fetchOlderMessages()
    }
}
</script>

<template>
    <section class="timeline" aria-label="タイムライン">
        <!-- ローディング -->
        <div v-if="store.isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <p class="state-message">読み込み中...</p>
            <SkeletonMessage />
            <SkeletonMessage />
            <SkeletonMessage />
            <SkeletonMessage />
        </div>

        <!-- エラー -->
        <div v-else-if="store.error" class="state-message error">
            {{ store.error }}
            <button @click="store.fetchTimeline()">再読み込み</button>
        </div>

        <!-- 空 -->
        <div v-else-if="store.messages.length === 0" class="state-message">
            メッセージがありません
        </div>

        <!--
            メッセージ一覧（仮想化）
            - 本文・引用・添付・スタンプで高さがばらばらなので、固定高さ前提の
              RecycleScroller ではなく DynamicScroller を使う。
            - page-mode: タイムラインは独自のスクロールコンテナを持たずページ全体が
              スクロールする。sticky なヘッダー／フッターと window.scrollTo を
              そのまま生かすため、スクローラにも同じ土俵に乗ってもらう。
            - 非同期に高さが伸びる（マークダウン解析 → 引用・添付の描画とその取得、
              スタンプ詳細のハイドレート）が、DynamicScrollerItem が ResizeObserver で
              測り直すので size-dependencies の指定は不要。
        -->
        <DynamicScroller
            v-else
            :items="store.messages"
            :min-item-size="120"
            key-field="id"
            page-mode
            :emit-update="true"
            @update="handleScrollerUpdate"
        >
            <template #default="{ item, index, active }">
                <DynamicScrollerItem :item="item" :active="active" :data-index="index">
                    <MessageItem :message="item" />
                </DynamicScrollerItem>
            </template>

            <!--
                末尾インジケータ。#after はリスト最終行の下に一度だけ描画され、
                スクローラ分岐がアクティブ（読み込み中でなく error でなく messages が 1 件以上）な
                ときだけマウントされるので、状態表示の置き場所として都合が良い。
            -->
            <template #after>
                <div class="timeline-foot" aria-live="polite">
                    <span v-if="store.isLoadingMore" class="timeline-foot__text">
                        過去の投稿を読み込み中...
                    </span>
                    <span v-else-if="store.loadMoreError" class="timeline-foot__error">
                        <span>{{ store.loadMoreError }}</span>
                        <button type="button" @click="store.fetchOlderMessages()">再試行</button>
                    </span>
                    <span v-else-if="!store.hasMore" class="timeline-foot__text">
                        これ以上はありません
                    </span>
                </div>
            </template>
        </DynamicScroller>
    </section>
</template>
<style scoped>

.loading-spinner {
    width: 2rem;
    height: 2rem;
    margin: 1rem auto;
    border: 4px solid var(--surface-border-secondary);
    border-top-color: var(--accent-color, #ffac47);
    border-radius: 50%;
    animation: loading-spin 0.8s linear infinite;
}

.loading-container p {
    text-align: center;
}

@keyframes loading-spin {
    to {
        transform: rotate(360deg);
    }
}
.timeline-foot {
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

.timeline-foot__error {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-negative);
}

.timeline-foot__error button {
    padding: 2px 10px;
    border: 1px solid var(--surface-border-primary);
    border-radius: 6px;
    background: var(--background);
    color: var(--text-primary);
    font-size: var(--text-size-s);
    cursor: pointer;
}

.timeline-foot__error button:hover {
    background: var(--surface-secondary);
}

</style>
