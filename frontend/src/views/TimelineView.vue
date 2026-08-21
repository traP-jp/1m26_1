<script setup lang="ts">
import TimelineContainer from '../components/timeline/TimelineContainer.vue'
import NewMessageBanner from '../components/timeline/NewMessageBanner.vue'
import { useTimelineStore } from '../stores/timelineStore'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { initiateLogin, handleOAuthCallback } from '../lib/auth'
import { initializeTimelineMetadata } from '../stores/timelineMetadata'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const timeline = useTimelineStore()

const isLoading = ref(true)
const authError = ref<string | null>(null)

const initializeTimeline = async () => {
    isLoading.value = true
    await Promise.all([
        timeline.fetchTimeline(),
        // メタデータの取得失敗時もタイムライン本体は表示する。
        initializeTimelineMetadata().catch((error: unknown) => {
            console.error('タイムライン用メタデータの取得に失敗:', error)
        }),
    ])
    isLoading.value = false
}

onMounted(async () => {
    const code = route.query.code as string
    const state = route.query.state as string

    // ============================================
    // 1. OAuth コールバック処理（code がある場合）
    // ============================================
    if (code) {
        console.log(code)
        const result = await handleOAuthCallback(code, state || '')

        if (result.success) {
            await initializeTimeline()
            await router.replace({ path: result.redirectTo, query: {} })
        } else {
            authError.value = result.error || '認証に失敗しました'
            isLoading.value = false
            await router.replace({ path: '/', query: {} })
        }
        return
    }

    // ============================================
    // 2. 通常の認証チェック（code がない場合）
    // ============================================
    if (authStore.isAuthenticated) {
        await initializeTimeline()
    } else {
        sessionStorage.setItem('login_redirect', route.fullPath)
        await initiateLogin()
    }
})
</script>

<template>
    <!-- ローディング中 -->
    <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>認証処理中...</p>
    </div>
    <div v-else-if="authError">{{ authError }}</div>
    <!-- タイムライン表示 -->
    <div v-else>
        <NewMessageBanner />
        <TimelineContainer :messages="timeline.messages" />
    </div>
</template>
