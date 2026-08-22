<script setup lang="ts">
import type { traQcomponents } from '../../types/traq'
import { useStampStore } from '../../stores/stampStore'

defineProps<{
    stamps: traQcomponents['schemas']['MessageStamp'][]
}>()

const stampStore = useStampStore()
</script>

<template>
    <div v-if="stamps.length" class="stamp-list">
        <span v-for="stamp in stamps" :key="stamp.stampId" class="stamp-item">
            <span v-if="stampStore.getStamp(stamp.stampId)?.isUnicode" class="stamp-emoji">
                {{ stampStore.getStampDisplayName(stamp.stampId) }}
            </span>
            <img
                v-else-if="stampStore.getStampImageUrl(stamp.stampId)"
                :src="stampStore.getStampImageUrl(stamp.stampId)"
                alt="stamp"
                class="stamp-image"
                referrerpolicy="no-referrer"
                loading="lazy"
                @error="
                    (e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                    }
                "
            />
            <span v-else class="stamp-name-fallback">
                :{{ stampStore.getStamp(stamp.stampId)?.name || '?' }}:
            </span>
            <span class="stamp-count">{{ stamp.count }}</span>
        </span>
    </div>
</template>

<style scoped>
.stamp-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 0;
}
.stamp-item {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--surface-secondary);
    border-radius: 4px;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: var(--text-size-m);
    height:24px;
}
.stamp-emoji {
    font-size: 18px;
}
.stamp-image {
    width: 24px;
    height: 24px;
    object-fit: contain;
    border-radius: 4px;
}
.stamp-name-fallback {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}
.stamp-count {
    font-size: var(--text-size-m);
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 16px;
    text-align: center;
}
</style>
