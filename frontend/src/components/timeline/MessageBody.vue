<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
    <p class="message-body">{{ content }}</p>
</template>
