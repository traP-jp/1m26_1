<script setup lang="ts">
import TimelineContainer from '../components/timeline/TimelineContainer.vue'
import NewMessageBanner from '../components/timeline/NewMessageBanner.vue'
import { useTimelineStore } from '../stores/timelineStore'

const timeline = useTimelineStore()
</script>

<template>
    <NewMessageBanner />
    <TimelineContainer :messages="timeline.messages" />
</template>
