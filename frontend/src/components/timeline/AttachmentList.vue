<script setup lang="ts">
defineProps<{ attachments: string[] }>()
</script>

<template>
    <ul v-if="attachments.length" class="attachment-list">
        <li v-for="attachment in attachments" :key="attachment">{{ attachment }}</li>
    </ul>
</template>
