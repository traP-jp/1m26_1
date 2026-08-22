<script setup lang="ts">
import type { traQcomponents } from '../../types/traq'
import { useUserStore } from '../../stores/userStore'
import { useChannelStore } from '../../stores/channelStore'
import { formatDate } from '../../lib/dateFormatter'
import { computed } from 'vue'

const props = defineProps<{ message: traQcomponents['schemas']['Message'] }>()

const userStore = useUserStore()
const channelStore = useChannelStore()

const userName = computed(() => userStore.getUserName(props.message.userId))
const iconUrl = computed(() => userStore.getIconUrl(props.message.userId))
const channelName = computed(() => channelStore.getChannelName(props.message.channelId))
</script>

<template>
    <header class="message-header">
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
        <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <br />
            <span class="channel-name">#{{ channelName }}</span>
        </div>
        <time class="timestamp">{{ formatDate(message.createdAt) }}</time>
    </header>
</template>

<style scoped>
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
.user-info {
    flex: 1;
    display: flex;
    gap: 8px;
    font-size: 14px;
}

.user-name {
    font-weight: 600;
    color: #1a1d23;
}

.channel-name {
    color: #6b7a8f;
}

.timestamp {
    font-size: 12px;
    color: #8e96a3;
}
.avatar {
    object-fit: cover;
}
</style>
