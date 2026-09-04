// src/lib/messageInteraction.ts

/**
 * 投稿カード全体をタップ可能にしたときに、タップを「カードを開く」と解釈してはいけない要素。
 *
 * カードの中には
 * - 本文 v-html 内のリンク（外部リンク・ユーザー/チャンネルメンション）
 * - スポイラー（MessageBody が click をデリゲートしてトグルする）
 * - スタンプ（role="button"）と「＋」パレットボタン
 * - 引用カード（QuotedMessage、role="link" で独自にタップ可能）とその「全文を表示する」
 * - 添付ファイルのダウンロードボタン
 * が同居しており、これらのタップでカードが開いてしまうと操作できなくなる。
 *
 * role="link"/"button" を含めているのは、投稿カード（MessageItem）の中に
 * 引用カード（QuotedMessage）というもう1つのタップ可能なカードが入れ子で
 * 存在するため。ガードなしだと、引用カードをタップしたときにクリックイベントが
 * 外側の投稿カードまでバブリングし、外側もタップされたと誤認して
 * 「引用元」と「引用している投稿」の両方へ同時に遷移しようとしてしまう。
 */
const INTERACTIVE_SELECTOR =
    'a, button, input, textarea, select, [role="button"], [role="link"], .spoiler'

/**
 * このタップでカードを開いてよいか。
 *
 * target から一番近い「対話要素」を探し、それが今まさにハンドラを張っている
 * カード自身（event.currentTarget）なら妨げない（カード自身の地の文をタップした
 * 通常のケース）。それより内側に別の対話要素があれば、そちらの操作を優先して
 * このカードは開かない。
 *
 * 本文をドラッグして選択した場合、指/ボタンを離した位置で click が飛ぶので、
 * 選択が残っているときも開かない（読むために選択しただけの操作を遷移にしない）。
 */
export const shouldOpenFromCardEvent = (event: Event): boolean => {
    const target = event.target as HTMLElement | null
    const currentTarget = event.currentTarget as HTMLElement | null
    const interactive = target?.closest(INTERACTIVE_SELECTOR) ?? null
    if (interactive && interactive !== currentTarget) return false
    if ((window.getSelection()?.toString() ?? '').length > 0) return false
    return true
}

/**
 * カード全体を role="link" にしたときの click / keydown.enter / keydown.space 共通ハンドラを作る。
 *
 * Space の preventDefault（ページスクロールを止める）は必ず開く判定のあとに行う。
 * 先に呼んでしまうと、カードの中のボタンにフォーカスして Space を押したときにも
 * 既定動作が消え、そのボタンを押せなくなる。
 */
export const createCardActivationHandler =
    (open: () => void) =>
    (event: MouseEvent | KeyboardEvent): void => {
        if (!shouldOpenFromCardEvent(event)) return
        if (event instanceof KeyboardEvent && event.key === ' ') {
            event.preventDefault()
        }
        open()
    }
