<template>
    <div
        class="stamp-item"
        @click="emit('click', stamp)"
        role="button"
        tabindex="0"
        @keydown.enter="emit('click', stamp)"
        :aria-label="getStampDisplayName(stamp.id)"
    >
        <!-- Unicode スタンプ -->
        <span v-if="stamp.isUnicode" class="stamp-emoji">
            {{ stamp.name }}
        </span>
        <!-- カスタムスタンプ -->
        <img
            v-else
            :src="getStampImageUrl(stamp.id)"
            :alt="stamp.name"
            class="stamp-image"
            referrerpolicy="no-referrer"
            loading="lazy"
            @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
        />
    </div>
</template>

<script setup lang="ts">
import { useStampStore } from '../../stores/stampStore'
import type { traQcomponents } from '../../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

const { stamp } = defineProps<{
    stamp: Stamp
}>()

const emit = defineEmits<{
    (e: 'click', stamp: Stamp): void
}>()

const stampStore = useStampStore()

const getStampDisplayName = (id: string) => stampStore.getStampDisplayName(id)
const getStampImageUrl = (id: string) => stampStore.getStampImageUrl(id, 24)
</script>

<style scoped>
.stamp-item {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--surface-secondary, #f5f5f7);
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    user-select: none;
}

.stamp-item:hover {
    background: var(--surface-hover, #e5e5ea);
    transform: scale(1.05);
}

.stamp-item:active {
    transform: scale(0.95);
}

.stamp-emoji {
    font-size: 32px;
    line-height: 1;
}

.stamp-image {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 4px;
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
    .stamp-item {
        background: #2c2c2e;
    }
    .stamp-item:hover {
        background: #3a3a3c;
    }
}
</style>
