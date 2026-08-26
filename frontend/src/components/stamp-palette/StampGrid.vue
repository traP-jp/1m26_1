<template>
    <div class="stamp-grid-wrapper">
        <div v-if="loading" class="loading-spinner">読み込み中...</div>
        <div v-else-if="stamps.length === 0" class="empty-state">スタンプが見つかりません</div>
        <RecycleScroller
            v-else
            :items="stamps"
            :item-size="32"
            :grid="true"
            :grid-items="columnCount"
            class="stamp-grid-scroller"
            key-field="id"
        >
            <template #default="{ item }">
                <StampItem
                    :stamp="item"
                    @click="emit('select', item)"
                    @hover="(stamp) => emit('hover', stamp)"
                />
            </template>
        </RecycleScroller>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import StampItem from './StampItem.vue'
import type { traQcomponents } from '../../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

const { stamps, loading } = defineProps<{
    stamps: Stamp[]
    loading?: boolean
}>()

const emit = defineEmits<{
    (e: 'select', stamp: Stamp): void
    (e: 'hover', stamp: Stamp | null): void // ★ 追加
}>()

// 動的に列数を計算（コンテナ幅に応じて10列程度を維持）
const columnCount = ref(10)
const containerRef = ref<HTMLElement | null>(null)

const updateColumns = () => {
    if (!containerRef.value) return
    const width = containerRef.value.clientWidth
    // アイテム幅32px + gap 4px => 36px
    const cols = Math.floor((width - 16) / 36)
    columnCount.value = Math.max(4, Math.min(12, cols))
}

// 親コンテナの幅変更を監視（簡単のため、ウィンドウリサイズで再計算）
const handleResize = () => updateColumns()

let observer: ResizeObserver | null = null

onMounted(() => {
    if (containerRef.value) {
        observer = new ResizeObserver(updateColumns)
        observer.observe(containerRef.value)
        updateColumns()
    }
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.stamp-grid-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    width: 100%;
}

.stamp-grid-scroller {
    height: 100%;
    max-height: 200px; /* 6行程度 */
    width: 100%;
}

/* RecycleScroller 内のアイテムを中央揃えにするためのオーバーライド */
:deep(.vue-recycle-scroller__item-wrapper) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
    padding: 4px 0;
}

:deep(.vue-recycle-scroller__item-view) {
    width: 32px !important;
    height: 32px !important;
    flex: 0 0 32px;
    margin: 1px;
}

.loading-spinner,
.empty-state {
    text-align: center;
    padding: 20px 0;
    color: var(--text-secondary, #8e8e93);
    font-size: 13px;
}
</style>
