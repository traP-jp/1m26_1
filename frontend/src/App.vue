<script setup lang="ts">
import AppFooter from './components/layout/AppFooter.vue'
import AppHeader from './components/layout/AppHeader.vue'
</script>

<template>
    <div class="app-shell">
        <AppHeader />
        <main>
            <!--
                タイムラインだけ KeepAlive で保持する。DynamicScroller が実測した
                投稿の高さ（ResizeObserver 由来）とスクロール位置を保ったまま
                詳細ビューへ行き来できるようにするため。:include はコンポーネント名で
                照合するので TimelineView.vue 側に defineOptions({ name: 'TimelineView' })
                が必要（スロット構文でないと :include が効かない）。
                詳細ビューは中心投稿ごとに別物なのでキャッシュしない。
            -->
            <RouterView v-slot="{ Component }">
                <KeepAlive :include="['TimelineView']">
                    <component :is="Component" />
                </KeepAlive>
            </RouterView>
        </main>
        <AppFooter />
    </div>
</template>
