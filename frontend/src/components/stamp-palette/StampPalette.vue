<template>
    <Teleport to="body">
        <div v-if="isOpen" class="stamp-palette-overlay" @click.self="close">
            <div class="stamp-palette">
                <!-- ヘッダー -->
                <div class="palette-header">
                    <span class="palette-title">スタンプ</span>
                    <button class="close-button" @click="close">✕</button>
                </div>

                <!-- 検索ボックス（のみ） -->
                <StampSearch v-model="searchQuery" />

                <!-- スタンプグリッド -->
                <div class="stamp-grid-container">
                    <StampGrid
                        :stamps="displayStamps"
                        :loading="loading"
                        @select="selectStamp"
                    />
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStampStore } from '../../stores/stampStore'
import StampSearch from './StampSearch.vue'
import StampGrid from './StampGrid.vue'
import type { traQcomponents } from '../../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'select', stamp: Stamp): void
}>()

const stampStore = useStampStore()

const isOpen = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const searchQuery = ref('')
const loading = ref(false)

// 表示スタンプ（検索フィルタのみ）
const displayStamps = computed(() => {
    const allStamps = Array.from(stampStore.stamps.values())
    if (!searchQuery.value.trim()) {
        return allStamps
    }
    return stampStore.searchStamps(searchQuery.value)
})

const selectStamp = (stamp: Stamp) => {
    emit('select', stamp)
    close()
}

const loadData = async () => {
    loading.value = true
    try {
        await stampStore.fetchStamps()
    } finally {
        loading.value = false
    }
}

watch(isOpen, (newVal) => {
    if (newVal) {
        loadData()
        // 開くたびに検索クエリをリセット（任意）
        searchQuery.value = ''
    }
})

const close = () => {
    isOpen.value = false
}
</script>

<style scoped>
.stamp-palette-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    backdrop-filter: blur(4px);
}

.stamp-palette {
    background: var(--surface-primary, #ffffff);
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    overflow: hidden;
}

.palette-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--surface-border, #e0e0e0);
}

.palette-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #1d1d1f);
}

.close-button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--text-secondary, #8e8e93);
    padding: 4px 8px;
    border-radius: 4px;
}

.close-button:hover {
    background: var(--surface-hover, #f0f0f0);
}

.stamp-grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
    .stamp-palette {
        background: #1d1d1f;
        border-color: #2c2c2e;
    }
    .palette-header {
        border-bottom-color: #2c2c2e;
    }
    .palette-title {
        color: #e8e8ed;
    }
    .close-button {
        color: #8e8e93;
    }
    .close-button:hover {
        background: #2c2c2e;
    }
}
</style>
