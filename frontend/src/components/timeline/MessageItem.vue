<script setup lang="ts">
import type { Message } from '../../types/traq'
// import AttachmentList from './AttachmentList.vue';
// AttachmentListはまだ使わないのでコメントアウト
import MessageBody from './MessageBody.vue'
import MessageHeader from './MessageHeader.vue'
import StampList from './StampList.vue'

defineProps<{ message: Message }>()
</script>

<template>
    <article class="message-item">
        <MessageHeader :message="message" />
        <MessageBody :content="message.content" />
        <StampList :stamps="message.stamps" />
    </article>
</template>
