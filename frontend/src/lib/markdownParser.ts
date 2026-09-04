// src/lib/markdownParser.ts
import { traQMarkdownIt } from '@traptitech/traq-markdown-it'
import { markdownStore } from '../stores/markdownStore'

const TRAQ_ORIGIN = 'https://q.trap.jp'

/**
 * Parser はコンポーネントインスタンス間で共有（再生成しない）
 * 内部的に Store を保持しているため、Store のデータ更新には追従する
 */
export const markdownParser = new traQMarkdownIt(markdownStore, undefined, TRAQ_ORIGIN)

/**
 * メンションのトークンから必要な部分だけを取り出すための最小の型。
 *
 * markdown-it は型定義を同梱しておらず @types/markdown-it も入れていないため、
 * markdownParser.md は any になる。ルール関数側を明示的に型付けして implicit any を避ける。
 */
type MentionToken = { attrGet(name: string): string | null }

const escapeHtmlAttr = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * traQ の内部リンク（@user / @group / #channel メンション）を <a> ではなく <span> で描画する。
 *
 * traq-markdown-it は href に markdownStore.generate*Href() の値（/users/<id> など）を入れるが、
 * このアプリにはユーザー／チャンネルのページが存在しない。踏むと存在しないパスへ
 * フルページ遷移してしまい、router の認証ガードから OAuth リダイレクトに飛ばされる。
 * リンクは持たせず、ライブラリ CSS の配色（青字・太字）だけを効かせたいので class は素通しする。
 *
 * traq_extends_link_open / _close にはライブラリ側のレンダラールールが無く、
 * markdown-it 既定の renderToken が <a> を吐いているだけなので、ここで上書きできる。
 */
const renderMentionOpen = (tokens: MentionToken[], idx: number): string => {
    const className = tokens[idx]?.attrGet('class') ?? ''
    return `<span class="${escapeHtmlAttr(className)}">`
}

const renderMentionClose = (): string => '</span>'

markdownParser.md.renderer.rules['traq_extends_link_open'] = renderMentionOpen
markdownParser.md.renderer.rules['traq_extends_link_close'] = renderMentionClose
