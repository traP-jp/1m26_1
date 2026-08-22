<template>
    <Transition name="slide">
        <div v-if="newMessageStore.isVisible" class="new-message-banner" @click="loadNewMessages">
            <div class="banner-content">
                <span class="arrow">↑</span>
                <!--icon image-proxyで表示-->
                <span class="icon"></span>

                <span class="text"> {{ newMessageStore.count }}件の新しい投稿を表示 </span>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { useNewMessageStore } from '../../stores/newMessageStore'

const emit = defineEmits<{
    (e: 'loadNewMessages'): void
}>()

const newMessageStore = useNewMessageStore()

const loadNewMessages = () => {
    emit('loadNewMessages')
}
</script>

<style scoped>
/* バナー全体 */
.new-message-banner {
    position: fixed;
    top: 128px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background-color: #ffac47; /* 指定の色に変更 */
    border-radius: 50px;
    padding: 4px 12px;
    cursor: pointer;
    user-select: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

/* ホバー時 */
.new-message-banner:hover {
    transform: translateX(-50%) translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    background-color: #e6942b; /* 自然なホバー用の少し暗めのオレンジ */
}

/* クリック時 */
.new-message-banner:active {
    transform: translateX(-50%) translateY(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 内部レイアウト */
.banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1;
}

/* 矢印 */
.arrow {
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
}

/* アバター群（サイズは大きくしたまま） */
.icon {
    position: relative;
    width: 56px;
    height: 32px;
    flex-shrink: 0;
}

/* 1つ目のアバター */
.icon::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-image: var(--avatar-a, url('https://i.pravatar.cc/50?img=1'));
    background-size: cover;
    border: 1px solid #ffac47; /* 背景色に合わせて変更 */
    z-index: 1;
}

/* 2つ目のアバター */
.icon::after {
    content: '';
    position: absolute;
    left: 24px;
    top: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-image: var(--avatar-b, url('https://i.pravatar.cc/50?img=2'));
    background-size: cover;
    border: 1px solid #ffac47; /* 背景色に合わせて変更 */
    z-index: 2;
}

/* テキスト */
.text {
    letter-spacing: 0.01em;
}

/* スライドトランジション */
.slide-enter-active {
    transition: all 0.3s ease-out;
}
.slide-leave-active {
    transition: all 0.3s ease-in;
}
.slide-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(-100%);
}
.slide-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-100%);
}
</style>
