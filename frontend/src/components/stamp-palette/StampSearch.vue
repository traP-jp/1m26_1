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
    padding: 10px 14px;
    flex-shrink: 0;
    background: #ffffff;
}

.search-input {
    width: 100%;
    padding: 6px 32px 6px 12px;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    font-size: 13px;
    background: #f8f9fa;
    color: #1d1d1f;
    outline: none;
    transition: all 0.2s;
    height: 32px;
}

.search-input:focus {
    border-color: #1d9bf0;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

.search-input::placeholder {
    color: #8e8e93;
    font-weight: 400;
}

.clear-button {
    position: absolute;
    right: 22px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #8e8e93;
    font-size: 14px;
    padding: 4px;
    border-radius: 4px;
    line-height: 1;
}

.clear-button:hover {
    color: #1d1d1f;
    background: #f0f0f0;
}
</style>
