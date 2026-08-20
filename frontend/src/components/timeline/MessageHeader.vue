<script setup lang="ts">
import type { TimelineMessage } from '../../types/message'
import { formatDate } from '../../lib/dateFormatter'

defineProps<{ message: TimelineMessage }>()
</script>

<template>
    <header class="message-header">
        <strong>{{ message.userName }}</strong>
        <time>{{ formatDate(message.createdAt) }}</time>
    </header>
</template>
