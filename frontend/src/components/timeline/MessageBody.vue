<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<template>
    <p class="message-body">{{ content }}</p>
</template>

<style scoped>
.message-body{
    margin: 0;
    font-size: 15px;
}
</style>
