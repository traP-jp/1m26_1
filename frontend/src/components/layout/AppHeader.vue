<script setup lang="ts">
import TabSelector from '../timeline/TabSelector/TabSelector.vue'
import { onMounted, onUnmounted, ref } from 'vue'

let lastScrollY = window.scrollY
const isDisplay = ref(true)

function handleScroll() {
    const currentScrollY = window.scrollY
    const scrollDistance = currentScrollY - lastScrollY

    if (scrollDistance > 0) {
        isDisplay.value = false
    } else if (scrollDistance < 0) {
        isDisplay.value = true
    }

    lastScrollY = currentScrollY
}
onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
})
</script>
<template>
    <header class="app-header" :class="{ 'is-scrolling': isDisplay }">
        <div>
            <RouterLink class="title" to="/">ドパガキ用traQ(仮)</RouterLink>
        </div>
        <TabSelector />
    </header>
</template>
<style>
.app-header {
    position: sticky;
    top: 0;
    background-color: var(--surface-translucent);
    backdrop-filter: blur(4px);
    width: 100vw;

    display: flex;
    gap: 0 !important; 
    flex-direction: column;
    opacity: 0.1;
    transition: opacity 150ms ease;
}
.is-scrolling {
    opacity: 1;
}
</style>
