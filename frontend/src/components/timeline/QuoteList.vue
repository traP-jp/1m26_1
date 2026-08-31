<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useMessageStore } from '../../stores/messageStore'
import type { traQcomponents } from '../../types/traq'
import QuotedMessage from './QuotedMessage.vue'

type Message = traQcomponents['schemas']['Message']

type QuoteItem =
    | { id: string; status: 'loaded'; message: Message }
    | { id: string; status: 'unavailable' }
    | { id: string; status: 'failed' }

const props = defineProps<{ messageIds: string[] }>()
const messageStore = useMessageStore()

watchEffect(() => {
    for (const id of props.messageIds) {
        messageStore.fetchMessage(id)
    }
})

const items = computed<QuoteItem[]>(() =>
    props.messageIds
        .map((id): QuoteItem | undefined => {
            const message = messageStore.getMessage(id)
            if (message) return { id, status: 'loaded', message }
            if (messageStore.isUnavailable(id)) return { id, status: 'unavailable' }
            if (messageStore.isFailed(id)) return { id, status: 'failed' }
            return undefined // 取得中は描画しない
        })
        .filter((item): item is QuoteItem => item !== undefined),
)
</script>

<template>
    <ul v-if="items.length" class="quote-list">
        <li v-for="item in items" :key="item.id" class="quote-list-item">
            <QuotedMessage v-if="item.status === 'loaded'" :message="item.message" />
            <p v-else-if="item.status === 'failed'" class="quote-unavailable">
                引用の読み込みに失敗しました
                <button
                    type="button"
                    class="quote-retry"
                    @click="messageStore.retryMessage(item.id)"
                >
                    再試行
                </button>
            </p>
            <p v-else class="quote-unavailable">存在しないか表示できないメッセージの引用です</p>
        </li>
    </ul>
</template>

<style scoped>
.quote-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0;
    margin: 0;
    list-style: none;
}

.quote-unavailable {
    margin: 0;
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}

.quote-retry {
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    color: var(--color-primary);
}
</style>
