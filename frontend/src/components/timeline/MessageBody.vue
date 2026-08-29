<script setup lang="ts">
import { computed } from 'vue'
import { traQMarkdownIt } from '@traptitech/traq-markdown-it'
import '@traptitech/traq-markdown-it/index.css'
import 'katex/dist/katex.min.css'

import { markdownStore } from '../../stores/markdownStore'

const TRAQ_ORIGIN = 'https://q.trap.jp'

const props = defineProps<{
    content: string
}>()

/**
 * Parser はコンポーネントインスタンス間で共有（再生成しない）
 * 内部的に Store を保持しているため、Store のデータ更新には追従する
 */
const parser = new traQMarkdownIt(markdownStore, undefined, TRAQ_ORIGIN)

const renderedHtml = computed(() => {
    if (!props.content) return ''

    try {
        return parser.render(props.content).renderedText
    } catch (error) {
        console.error('traQ Markdown rendering error:', error)
        return ''
    }
})
</script>

<template>
    <div v-if="renderedHtml" class="markdown-body" v-html="renderedHtml" />
</template>

<style scoped>
@import 'katex/dist/katex.min.css';

.markdown-body :deep(pre code) {
    color: #e8e8ed; /* 白に近い明るい色 */
}

/* インラインコード（`code`）は背景色と文字色のバランスを保つ */
.markdown-body :deep(code:not(pre code)) {
    color: #1d1d1f;
    background: #f5f5f7;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
}

/* ★ KaTeX のフォントをグローバルフォントより優先 */
.markdown-body :deep(.katex) {
    font-family: 'KaTeX_Main', 'Times New Roman', serif !important;
}

.markdown-body :deep(.katex .mathnormal) {
    font-family: 'KaTeX_Math', 'Times New Roman', serif !important;
    font-style: italic;
}

.markdown-body :deep(.katex .mord) {
    /* 数字部分も確実に KaTeX フォントに */
    font-family: 'KaTeX_Main', 'Times New Roman', serif !important;
}
</style>
