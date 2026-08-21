<script setup lang="ts">
import type { Message } from '../../types/traq'

defineProps<{ stamps: Message['stamps'] }>()
</script>

<template>
    <p v-if="stamps.length" class="stamp-list">
        {{ stamps.map((stamp) => `${stamp.stampId} ×${stamp.count}`).join(' ') }}
    </p>
</template>
