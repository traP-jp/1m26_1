<script setup lang="ts">
import type { Message } from '../../types/traq'
import { useUserStore } from '../../stores/userStore'
// import AttachmentList from './AttachmentList.vue';
// AttachmentListはまだ使わないのでコメントアウト
import MessageBody from './MessageBody.vue'
import MessageHeader from './MessageHeader.vue'
import StampList from './StampList.vue'
import { computed } from 'vue'

const userStore = useUserStore()
const props = defineProps<{ message: Message }>()
const iconUrl = computed(() => userStore.getIconUrl(props.message.userId))
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
            <MessageBody :content="message.content" />
            <StampList :stamps="message.stamps" />
        </div>
    </article>
</template>

<style scoped>
.message-item{
    display: flex;
    gap:10px;
    padding: 12px 16px;
}
.avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px; /* アイコンサイズ */
    color: #6b7a8f;
    flex-shrink: 0;
}
.avatar {
    object-fit: cover;
    width: 40px;
    height: 40px;
    border-radius: 50%;
}
.message-area{
    flex-grow: 1;
}
</style>
