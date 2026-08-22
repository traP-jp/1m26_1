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
const channelName = computed(() => channelStore.getChannelName(props.message.channelId))
</script>

<template>
    <header class="message-header">
        <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <time class="timestamp">{{ formatDate(message.createdAt) }}</time>
            <span class="channel-name">#{{ channelName }}</span>
        </div>
    </header>
</template>

<style scoped>
.user-info {
    flex: 1;
    display: grid;
    padding: 6px;
    row-gap: 4px;
    column-gap: 4px;
    grid-template-rows: repeat(2, fit-content(100%));
    grid-template-columns: 1fr minmax(0, 1fr) 1fr;
}
.user-name {
    font-weight: 600;
    color: #1a1d23;
    white-space: nowrap;
    grid-column: 1;
    grid-row: 1;
    font-size: 15px;
}
.timestamp {
    font-size: 12px;
    color: #8e96a3;
    white-space: nowrap;
    grid-column: 3;
    grid-row: 1;
    font-size: 12px;
}
.channel-name {
    color: #6b7a8f;
    overflow: hidden;
    white-space: nowrap;
    grid-column: 1;
    grid-row: 2;
    font-size: 12px;
    font-weight: 500;
}
</style>
