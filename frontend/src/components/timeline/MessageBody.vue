<script setup lang="ts">
import { computed, watch } from 'vue'
import { traQMarkdownIt } from '@traptitech/traq-markdown-it'
import type {
    EmbeddingFile,
    EmbeddingMessage,
    MarkdownRenderResult,
} from '@traptitech/traq-markdown-it'
import '@traptitech/traq-markdown-it/index.css'
import 'katex/dist/katex.min.css'

import { markdownStore } from '../../stores/markdownStore'

const TRAQ_ORIGIN = 'https://q.trap.jp'

const props = defineProps<{
    content: string
}>()

const emit = defineEmits<{
    (e: 'attachments', fileIds: string[]): void
    (e: 'quotes', messageIds: string[]): void
}>()

/**
 * Parser はコンポーネントインスタンス間で共有（再生成しない）
 * 内部的に Store を保持しているため、Store のデータ更新には追従する
 */
const parser = new traQMarkdownIt(markdownStore, undefined, TRAQ_ORIGIN)

const EMPTY_RESULT: MarkdownRenderResult = { renderedText: '', rawText: '', embeddings: [] }

/**
 * renderedHtml と添付ファイルID一覧の両方をここから導出する（二重パース回避）
 */
const renderResult = computed<MarkdownRenderResult>(() => {
    if (!props.content) return EMPTY_RESULT

    try {
        return parser.render(props.content)
    } catch (error) {
        console.error('traQ Markdown rendering error:', error)
        return EMPTY_RESULT
    }
})

const renderedHtml = computed(() => renderResult.value.renderedText)

// 末尾が埋め込みのみの投稿は "<p></p>\n"（truthy）になる。空要素として扱い本文ブロックごと描画しない
const EMPTY_RENDERED_HTML = /^(?:\s|<p>\s*<\/p>)*$/
const hasRenderedBody = computed(() => !EMPTY_RENDERED_HTML.test(renderResult.value.renderedText))

// 埋め込み URL は出現順で全件をカード化する。
// parser.render() が末尾の埋め込みだけを renderedText から除去するので、
// - 末尾の URL: 本文には出ず、カードだけが並ぶ（複数並んでいれば上から順に）
// - 末尾以外の URL: 本文にインラインリンクとして残しつつ、カードも表示する
const fileIds = computed(() =>
    renderResult.value.embeddings
        .filter((e): e is EmbeddingFile => e.type === 'file')
        .map((e) => e.id),
)

const quotedMessageIds = computed(() =>
    renderResult.value.embeddings
        .filter((e): e is EmbeddingMessage => e.type === 'message')
        .map((e) => e.id),
)

watch(fileIds, (ids) => emit('attachments', ids), { immediate: true })
watch(quotedMessageIds, (ids) => emit('quotes', ids), { immediate: true })

/**
 * スポイラー（!!テキスト!!）の表示切り替え
 *
 * traq-markdown-it は `<span class="spoiler">` を出力するだけで、
 * 表示状態を制御する `shown` 属性の付け外しはホスト側の責務。
 * v-html で描画しているため Vue のイベントバインディングが張れないので、
 * コンテナで click をデリゲートして最も近い .spoiler の属性をトグルする。
 */
const onBodyClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const spoiler = target?.closest<HTMLElement>('.spoiler')
    if (!spoiler) return

    // 開いた状態でリンクを踏んだときに閉じてしまわないようにする
    if (spoiler.hasAttribute('shown') && target?.closest('a')) return

    spoiler.toggleAttribute('shown')
}
</script>

<template>
    <div v-if="hasRenderedBody" class="markdown-body" v-html="renderedHtml" @click="onBodyClick" />
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
