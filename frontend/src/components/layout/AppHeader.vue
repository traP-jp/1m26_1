<script setup lang="ts">
import TabSelector from '../timeline/TabSelector/TabSelector.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 中身は人気/最新タブだけなので、タイムライン以外ではヘッダーごと出さない。
// 詳細ビューは自前のチャンネルヘッダーが同じ高さで画面上端に貼り付く。
const isTimeline = computed(() => route.name === 'timeline')

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
    <header v-if="isTimeline" class="app-header" :class="{ 'is-scrolling': isDisplay }">
        <TabSelector />
    </header>
</template>
<style scoped>
.app-header {
    position: sticky;
    top: 0;
    /* traq-markdown-it の <pre> は position: relative（z-index なし）で、
       ヘッダーより後ろの DOM に出る。ヘッダーにも z-index が無いと
       同じ重なり階層で「後勝ち」になりコードブロックがヘッダーの上に描画される。
       明示的に z-index を与えて常にヘッダーを前面に固定する。 */
    z-index: 20;

    width: 100%;
    display: flex;
    /* タブを行いっぱいに伸ばし、選択中の下線をヘッダーの下端に乗せる */
    align-items: stretch;
    /* 高さは --header-height だけで決める（詳細ビューのチャンネルヘッダーと揃える）。
       padding を持たせるとその分だけ高くなってしまうので 0 のまま。 */
    padding: 0;
    min-height: var(--header-height);
    border-bottom: 1px solid var(--surface-border-secondary);

    /* 背景は下のコンテンツをぼかして常に敷く。要素ごと透過させるとブラーまで
       薄まってしまうので、透過させるのは中のタブだけにする。 */
    background-color: var(--surface-overlay);
    /* -webkit- 付きは書かない。ビルド（lightningcss）が自動で足してくれるうえ、
       手で後ろに並べると標準プロパティの方が重複扱いで削られてしまう */
    backdrop-filter: blur(12px) saturate(180%);
}

/* 下向きにスクロール中はタブを控えめにする。ただし読める程度までに留める */
.app-header :deep(.selector) {
    opacity: 0.7;
    transition: opacity 150ms ease;
}
.app-header.is-scrolling :deep(.selector) {
    opacity: 1;
}
</style>
