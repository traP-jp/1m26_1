<script setup lang="ts">
defineProps<{
    isFiltered: boolean
}>()
</script>
<template>
    <button v-if="isFiltered" class="button on">
        購読のみ
        <img src="../../assets/filter.svg" alt="" />
    </button>
    <button v-else class="button off">
        全体表示
        <img src="../../assets/nofilter.svg" alt="" />
    </button>
</template>
<style scoped>
.button {
    border-radius: 8px;
    width: 100px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 15px;
    font-weight: 500;
    overflow: hidden;
    flex-shrink: 0;
}
.button.on {
    background-color: var(--text-button-fill-background);
    border: none;
    color: var(--text-button-fill-text);
}
.button.off {
    background-color: transparent;
    border: 2px solid var(--surface-border-primary);
    color: var(--text-secondary);
}
</style>
