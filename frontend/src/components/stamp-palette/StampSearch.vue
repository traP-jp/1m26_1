<template>
    <div class="stamp-search">
        <input
            type="text"
            :value="modelValue"
            @input="updateValue($event)"
            placeholder="スタンプを検索..."
            class="search-input"
        />
        <span v-if="modelValue" class="clear-button" @click="clear">✕</span>
    </div>
</template>

<script setup lang="ts">
const { modelValue } = defineProps<{
    modelValue: string
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

let debounceTimer: number | null = null

const updateValue = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (!target) return
    const value = target.value

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
        emit('update:modelValue', value)
    }, 300)
}

const clear = () => {
    emit('update:modelValue', '')
}
</script>

<style scoped>
.stamp-search {
    position: relative;
    padding: 12px 16px;
}

.search-input {
    width: 100%;
    padding: 8px 36px 8px 12px;
    border: 1px solid var(--surface-border, #d0d0d0);
    border-radius: 8px;
    font-size: 14px;
    background: var(--surface-secondary, #f5f5f7);
    color: var(--text-primary, #1d1d1f);
    outline: none;
    transition: border-color 0.2s;
}

.search-input:focus {
    border-color: var(--accent-color, #1d9bf0);
    background: var(--surface-primary, #ffffff);
}

.clear-button {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: var(--text-secondary, #8e8e93);
    font-size: 14px;
    padding: 4px;
}

.clear-button:hover {
    color: var(--text-primary, #1d1d1f);
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
    .search-input {
        background: #2c2c2e;
        border-color: #3a3a3c;
        color: #e8e8ed;
    }
    .search-input:focus {
        background: #1d1d1f;
        border-color: #1d9bf0;
    }
    .clear-button {
        color: #8e8e93;
    }
    .clear-button:hover {
        color: #e8e8ed;
    }
}
</style>
