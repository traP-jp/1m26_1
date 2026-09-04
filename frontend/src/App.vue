<script setup lang="ts">
import AppFooter from './components/layout/AppFooter.vue'
import AppHeader from './components/layout/AppHeader.vue'
import TimelineView from './views/TimelineView.vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentView = ref<InstanceType<typeof TimelineView> | null>(null)
const isTimelineLoading = computed(
    () => route.name === 'timeline' && (currentView.value?.isLoading ?? true),
)
</script>

<template>
    <div class="app-shell">
        <AppHeader v-if="!isTimelineLoading" />
        <main>
            <RouterView v-slot="{ Component }">
                <component :is="Component" ref="currentView" />
            </RouterView>
        </main>
        <AppFooter v-if="!isTimelineLoading" />
    </div>
</template>
