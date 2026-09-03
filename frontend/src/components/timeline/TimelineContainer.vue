<script setup lang="ts">
import MessageItem from './MessageItem.vue'
import { useTimelineStore } from '../../stores/timelineStore'

const store = useTimelineStore()

// 親コンポーネントへイベントを伝播するための emit
const emit = defineEmits<{
    (e: 'open-palette', messageId: string, position: { x: number; y: number }): void
}>()
</script>

<template>
    <section class="timeline" aria-label="タイムライン">
        <!-- ローディング -->
        <div v-if="store.isLoading" class="state-message">読み込み中...</div>

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
