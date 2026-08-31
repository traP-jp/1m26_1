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
    grid-template-columns: minmax(0, 1fr) auto;
}
/* 表示名と @ID は 1 本ずつトラックを分け合い、溢れたら両方が省略される */
.user-names {
    grid-column: 1;
    grid-row: 1;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, auto);
    justify-content: start;
    align-items: baseline;
    column-gap: 4px;
    min-width: 0;
}
.user-name {
    font-size: var(--text-size-m);
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.traq-id {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.timestamp {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    white-space: nowrap;
    grid-column: 2;
    grid-row: 1;
}
.channel-name {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    grid-column: 1 / 3;
    grid-row: 2;
}
</style>
