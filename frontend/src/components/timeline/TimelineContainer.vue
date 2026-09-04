<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import { useTimelineStore } from '../../stores/timelineStore'
import SkeletonMessage from './SkeletonMessage.vue'

const store = useTimelineStore()

// 親コンポーネントへイベントを伝播するための emit
const emit = defineEmits<{
    (e: 'open-palette', messageId: string, position: { x: number; y: number }): void
}>()
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
        >
            <template #default="{ item, index, active }">
                <DynamicScrollerItem :item="item" :active="active" :data-index="index">
                    <MessageItem
                        :message="item"
                        @open-palette="(id, pos) => emit('open-palette', id, pos)"
                    />
                </DynamicScrollerItem>
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
</style>
