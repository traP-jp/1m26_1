<template>
    <Teleport to="body">
        <div v-if="isOpen" class="stamp-palette-backdrop" @click.self="close">
            <div class="stamp-palette" :style="paletteStyle" @click.stop>
                <!-- 検索ボックス -->
                <StampSearch v-model="searchQuery" />

                <!-- スタンプグリッド -->
                <div class="stamp-grid-container">
                    <StampGrid
                        :stamps="displayStamps"
                        :loading="loading"
                        @select="selectStamp"
                        @hover="handleHoverStamp"
                    />
                </div>

                <div v-if="hoveredStamp" class="stamp-preview">
                    <div class="preview-icon">
                        <img
                            :src="getStampImageUrl(hoveredStamp.id, 48)"
                            alt=""
                            class="preview-image"
                            referrerpolicy="no-referrer"
                            loading="lazy"
                        />
                    </div>
                    <span class="preview-name">{{ getStampDisplayName(hoveredStamp.id) }}</span>
                </div>
                <!-- ホバーなしの場合はスペーサー（高さを維持） -->
                <div v-else class="stamp-preview-placeholder"></div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { ref, computed, watch } from 'vue'
import { useStampStore } from '../../stores/stampStore'
import StampSearch from './StampSearch.vue'
import StampGrid from './StampGrid.vue'
import type { traQcomponents } from '../../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

const props = defineProps<{
    modelValue: boolean
    position: { x: number; y: number }
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'select', stamp: Stamp): void
    (e: 'close'): void
}>()

const stampStore = useStampStore()

const isOpen = computed({
    get: () => props.modelValue,
    set: (v) => {
        emit('update:modelValue', v)
        if (!v) emit('close')
    },
})

const searchQuery = ref('')
const loading = ref(false)
const hoveredStamp = ref<Stamp | null>(null) // ★ 追加

// ★ パレットの表示位置を計算
const paletteStyle = computed<CSSProperties>(() => {
    const { x, y } = props.position
    const paletteWidth = 360
    const paletteHeight = 320

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = x
    let top = y

    if (left + paletteWidth > viewportWidth - 16) {
        left = viewportWidth - paletteWidth - 16
    }
    if (left < 16) {
        left = 16
    }

    if (top + paletteHeight > viewportHeight - 16) {
        top = y - paletteHeight - 8
    }
    if (top < 16) {
        top = 16
    }

    return {
        left: `${left}px`,
        top: `${top}px`,
        transform: 'none',
        position: 'fixed',
        bottom: 'auto',
        width: `${paletteWidth}px`,
        maxWidth: `${Math.min(viewportWidth - 32, paletteWidth)}px`,
        maxHeight: `${Math.min(viewportHeight - 32, paletteHeight)}px`,
    } as CSSProperties // ← アサーションも有効
})

const displayStamps = computed(() => {
    const allStamps = Array.from(stampStore.stamps.values())
    if (!searchQuery.value.trim()) {
        return allStamps
    }
    return stampStore.searchStamps(searchQuery.value)
})

const selectStamp = (stamp: Stamp) => {
    emit('select', stamp)
}

const loadData = async () => {
    loading.value = true
    try {
        await stampStore.fetchStamps()
    } finally {
        loading.value = false
    }
}
// ★ ホバーイベントハンドラ
const handleHoverStamp = (stamp: Stamp | null) => {
    hoveredStamp.value = stamp
}

// ★ プレビュー用のヘルパー
const getStampImageUrl = (id: string, size: number) => stampStore.getStampImageUrl(id, size)
const getStampDisplayName = (id: string) => stampStore.getStampDisplayName(id)

watch(isOpen, (newVal) => {
    if (newVal) {
        loadData()
        searchQuery.value = ''
    }
})

const close = () => {
    isOpen.value = false
}
</script>

<style scoped>
/* ===== バックドロップ（透過） ===== */
.stamp-palette-backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    pointer-events: auto;
    z-index: 9998;
}

/* ===== パレット本体（ライトモードベース） ===== */
.stamp-palette {
    position: fixed;
    background: #ffffff;
    border-radius: 12px;
    box-shadow:
        0 8px 30px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
    min-width: 280px;
    /* width, max-height は JavaScript で動的に設定 */
}

/* ===== ヘッダー ===== */
.palette-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid #e9ecef;
    flex-shrink: 0;
    background: #fafbfc;
}

.palette-title {
    font-size: 14px;
    font-weight: 600;
    color: #1d1d1f;
    letter-spacing: -0.2px;
}

.close-button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #8e8e93;
    padding: 0 6px;
    border-radius: 4px;
    line-height: 1;
    transition: background 0.15s;
}

.close-button:hover {
    background: #f0f0f0;
    color: #1d1d1f;
}

/* ===== グリッドエリア ===== */
.stamp-grid-container {
    flex: 1;
    padding: 8px 6px 12px 6px;
    overflow: hidden;
    min-height: 120px;
    max-height: 220px;
    background: #ffffff;
}

.stamp-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    border-top: 1px solid #e9ecef;
    background: #fafbfc;
    min-height: 56px;
    flex-shrink: 0;
}

.stamp-preview-placeholder {
    min-height: 56px;
    flex-shrink: 0;
}

.preview-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    flex-shrink: 0;
}

.preview-emoji {
    font-size: 28px;
    line-height: 1;
}

.preview-image {
    width: 36px;
    height: 36px;
    object-fit: contain;
}

.preview-name {
    font-size: 14px;
    font-weight: 500;
    color: #1d1d1f;
    letter-spacing: -0.2px;
}
</style>
