<template>
    <div
        class="stamp-item"
        @click="emit('click', stamp)"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        role="button"
        tabindex="0"
        @keydown.enter="emit('click', stamp)"
        :aria-label="getStampDisplayName(stamp.id)"
    >
        <img
            :src="getStampImageUrl(stamp.id)"
            :alt="stamp.name"
            class="stamp-image"
            referrerpolicy="no-referrer"
            loading="lazy"
            @error="
                (e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                }
            "
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
    (e: 'hover', stamp: Stamp | null): void // ★ 追加
}>()

const stampStore = useStampStore()

const getStampDisplayName = (id: string) => stampStore.getStampDisplayName(id)
const getStampImageUrl = (id: string) => stampStore.getStampImageUrl(id, 24)

const onMouseEnter = () => {
    emit('hover', stamp)
}
const onMouseLeave = () => {
    emit('hover', null)
}
</script>

<style scoped>
.stamp-item {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition:
        background 0.15s,
        transform 0.1s;
    user-select: none;
    padding: 4px;
    box-sizing: border-box;
}

.stamp-item:hover {
    background: var(--surface-hover, #e5e5ea);
    transform: scale(1.1);
}

.stamp-item:active {
    transform: scale(0.9);
}

.stamp-emoji {
    font-size: 18px;
    line-height: 1;
}

.stamp-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 2px;
}

</style>
