<template>
    <button class="trigger-button" @click="open" aria-label="スタンプパレットを開く">
        <slot>
            <span>😊</span>
        </slot>
    </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
    (e: 'open'): void
}>()

const open = () => emit('open')
</script>

<style scoped>
.trigger-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s;
}

.trigger-button:hover {
    background: var(--surface-hover, #f0f0f0);
}
</style>
