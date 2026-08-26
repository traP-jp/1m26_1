<script setup lang="ts">
import type { Message } from '../../types/traq'
import MessageItem from './MessageItem.vue'
import { useTimelineStore } from '../../stores/timelineStore'

const store = useTimelineStore()

defineProps<{ messages: Message[] }>()

// 親コンポーネントへイベントを伝播するための emit
const emit = defineEmits<{
    (e: 'open-palette', messageId: string, position: { x: number; y: number }): void
}>()
</script>

<template>
    <section class="timeline" aria-label="タイムライン">
        <!-- ローディング -->
        <div v-if="store.isLoading" class="state-message">読み込み中...</div>

        <!-- エラー -->
        <div v-else-if="store.error" class="state-message error">
            {{ store.error }}
            <button @click="store.fetchTimeline()">再読み込み</button>
        </div>

        <!-- 空 -->
        <div v-else-if="store.messages.length === 0" class="state-message">
            メッセージがありません
        </div>

        <!-- メッセージ一覧 -->
        <MessageItem
            v-for="message in store.messages"
            :key="message.id"
            :message="message"
            @open-palette="(id, pos) => emit('open-palette', id, pos)"
        />
    </section>
</template>
