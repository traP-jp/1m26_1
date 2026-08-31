<script setup lang="ts">
import type { Message } from '../../types/traq'
import { useUserStore } from '../../stores/userStore'
import AttachmentList from './AttachmentList.vue'
import MessageBody from './MessageBody.vue'
import MessageHeader from './MessageHeader.vue'
import QuoteList from './QuoteList.vue'
import StampList from './StampList.vue'
import { computed, ref } from 'vue'

const userStore = useUserStore()
const props = defineProps<{ message: Message }>()
const iconUrl = computed(() => userStore.getIconUrl(props.message.userId))
const attachmentFileIds = ref<string[]>([])
const quotedMessageIds = ref<string[]>([])

const emit = defineEmits<{
    (e: 'open-palette', messageId: string, position: { x: number; y: number }): void
}>()
</script>

<template>
    <article class="message-item">
        <div>
            <img
                v-if="iconUrl"
                :src="iconUrl"
                alt="avatar"
                class="avatar"
                referrerpolicy="no-referrer"
            />
            <div class="avatar-placeholder" v-else>
                <i class="fas fa-user"></i>
            </div>
        </div>
        <div class="message-area">
            <MessageHeader :message="message" />
            <MessageBody
                :content="message.content"
                @attachments="(ids) => (attachmentFileIds = ids)"
                @quotes="(ids) => (quotedMessageIds = ids)"
            />
            <QuoteList v-if="quotedMessageIds.length" :message-ids="quotedMessageIds" />
            <AttachmentList v-if="attachmentFileIds.length" :file-ids="attachmentFileIds" />
            <StampList
                :stamps="message.stamps"
                :message-id="message.id"
                @open-palette="(id, pos) => emit('open-palette', id, pos)"
            />
        </div>
    </article>
</template>

<style scoped>
.message-item {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--surface-border-secondary);
}
.avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--gray-300);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px; /* アイコンサイズ */
    color: var(--text-secondary);
    flex-shrink: 0;
}
.avatar {
    object-fit: cover;
    width: 40px;
    height: 40px;
    border-radius: 50%;
}
.message-area {
    flex-grow: 1;
    /* 既定の min-width: auto だと、コード行など折り返せない中身が本文幅を押し広げてしまう */
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
