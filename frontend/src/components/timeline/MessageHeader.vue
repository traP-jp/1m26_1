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
const traqId = computed(() => userStore.getUser(props.message.userId)?.name)
const channelName = computed(() => channelStore.getChannelName(props.message.channelId))
</script>

<template>
    <header class="message-header">
        <div class="user-info">
            <div class="user-names">
                <span class="user-name">{{ userName }}</span>
                <span class="traq-id" v-if="traqId">@{{ traqId }}</span>
            </div>
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
.user-names {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    grid-column: 1 / span 2;
    grid-row: 1;
}
.user-name {
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    flex-shrink: 0;
    font-size: var(--text-size-m);
}
.traq-id {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}
.timestamp {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    white-space: nowrap;
    grid-column: 3;
    grid-row: 1;
}
.channel-name {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    grid-column: 1;
    grid-row: 2;
}
</style>
