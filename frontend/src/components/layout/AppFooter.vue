<script setup lang="ts">
import homeIcon from '../../assets/home.svg'
import notificationIcon from '../../assets/notification.svg'
import notificationActiveIcon from '../../assets/notification_active.svg'
import profileIcon from '../../assets/profile.svg'
import { onMounted, onUnmounted, ref } from 'vue'

//TODO: 通知の状態に応じて切り替える
const isNotificationActive = true

const isScrolling = ref(false)
let scrollTimer: ReturnType<typeof setTimeout> | undefined

function handleScroll() {
    isScrolling.value = true

    if (scrollTimer) {
        clearTimeout(scrollTimer)
    }

    scrollTimer = setTimeout(() => {
        isScrolling.value = false
    }, 150)
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    if (scrollTimer) {
        clearTimeout(scrollTimer)
    }
})
</script>

<template>
    <footer class="app-footer" :class="{ 'is-scrolling': isScrolling }">
        <RouterLink to="/">
            <img :src="profileIcon" alt="プロフィール" />
        </RouterLink>
        <RouterLink to="/">
            <img :src="homeIcon" alt="ホーム" />
        </RouterLink>
        <RouterLink to="/">
            <img
                :src="isNotificationActive ? notificationActiveIcon : notificationIcon"
                alt="通知"
            />
        </RouterLink>
    </footer>
</template>
<style scoped>
.app-footer {
    position: sticky;
    bottom: 0;
    width: 100%;
    border-top: 1px solid var(--surface-border-secondary);
    background: var(--surface-translucent, rgba(255, 255, 255, 0.8));
    backdrop-filter: blur(4px);
    transition: opacity 150ms ease;
    opacity: 1;

    padding: 8px 0;
    display: flex;
    justify-content: center;
    gap: 64px;
}

.app-footer.is-scrolling {
    opacity: 0.3;
}
</style>
