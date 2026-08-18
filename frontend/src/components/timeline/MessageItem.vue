<script setup lang="ts">
import type { TimelineMessage } from '../../types/message'
import AttachmentList from './AttachmentList.vue'
import MessageBody from './MessageBody.vue'
import MessageHeader from './MessageHeader.vue'
import StampList from './StampList.vue'

defineProps<{ message: TimelineMessage }>()
</script>

<template>
    <article class="message-item">
        <MessageHeader :message="message" />
        <MessageBody :content="message.content" />
        <AttachmentList :attachments="message.attachments" />
        <StampList :stamps="message.stamps" />
    </article>
</template>
