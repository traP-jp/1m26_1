<script setup lang="ts">
import type { Message } from '../../types/traq'
import { formatDate } from '../../lib/dateFormatter'

defineProps<{ message: Message }>()
</script>

<template>
    <header class="message-header">
        
        <strong>{{ message.userId }}</strong>
        <time>{{ formatDate(message.createdAt) }}</time>
    </header>
</template>
