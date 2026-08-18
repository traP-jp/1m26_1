<script setup lang="ts">
import type { TimelineMessage } from '../../types/message'
import MessageItem from './MessageItem.vue'

defineProps<{ messages: TimelineMessage[] }>()
</script>

<template>
    <section class="timeline" aria-label="タイムライン">
        <MessageItem v-for="message in messages" :key="message.id" :message="message" />
    </section>
</template>
