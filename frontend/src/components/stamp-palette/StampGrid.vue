<template>
    <div class="stamp-grid">
        <div v-if="loading" class="loading-spinner">読み込み中...</div>
        <div v-else-if="stamps.length === 0" class="empty-state">
            スタンプが見つかりません
        </div>
        <StampItem
            v-else
            v-for="stamp in stamps"
            :key="stamp.id"
            :stamp="stamp"
            @click="emit('select', stamp)"
        />
    </div>
</template>

<script setup lang="ts">
import StampItem from './StampItem.vue'
import type { traQcomponents } from '../../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

const { stamps, loading } = defineProps<{
    stamps: Stamp[]
    loading?: boolean
}>()

const emit = defineEmits<{
    (e: 'select', stamp: Stamp): void
}>()
</script>

<style scoped>
.stamp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 8px;
    justify-items: center;
}

.loading-spinner,
.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px 0;
    color: var(--text-secondary, #8e8e93);
    font-size: 14px;
}
</style>
