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
    /* traq-markdown-it の <pre> は position: relative（z-index なし）で、
       ヘッダーより後ろの DOM に出る。ヘッダーにも z-index が無いと
       同じ重なり階層で「後勝ち」になりコードブロックがヘッダーの上に描画される。
       明示的に z-index を与えて常にヘッダーを前面に固定する。 */
    z-index: 20;

    background-color: var(--surface-overlay);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    width: 100%;
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
