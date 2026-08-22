<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
    <p class="message-body">{{ content }}</p>
</template>

<style scoped>
.message-body{
    margin: 0;
    font-size: var(--text-size-m);
}
</style>
