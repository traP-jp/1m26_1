<script setup lang="ts">
defineProps<{ stamps: string[] }>()
</script>

<template>
    <p v-if="stamps.length" class="stamp-list">{{ stamps.join(' ') }}</p>
</template>
