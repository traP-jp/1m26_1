// src/lib/scrollAnchor.ts
import { nextTick } from 'vue'

/** これを過ぎたら諦める。実測が永久に確定しない場合の無限ループ防止 */
const SETTLE_TIMEOUT_MS = 1500
/** 「安定した」がこの回数続いたら落ち着いたとみなす */
const STABLE_FRAMES = 5

/**
 * 毎フレーム step を呼び、安定（true）が STABLE_FRAMES 回続くまで待つ。
 *
 * 投稿の高さは描画後に伸びる（本文の Markdown 解析 → 引用・添付の描画とその取得、
 * スタンプ詳細のハイドレート）ため、スクロール位置の調整は一度合わせて終わりにできない。
 * step でズレを打ち消し、打ち消す必要がなくなるまで追従するのがこの関数の役割。
 *
 * @param step 1 フレーム分の調整。調整が不要（＝安定している）なら true を返す
 * @param signal 呼び出し元が追従を中断するためのシグナル
 */
export function waitUntilStable(step: () => boolean, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve) => {
        let stableFrames = 0
        let frame: number | undefined
        const deadline = performance.now() + SETTLE_TIMEOUT_MS

        const finish = () => {
            if (frame !== undefined) cancelAnimationFrame(frame)
            signal?.removeEventListener('abort', finish)
            resolve()
        }

        const tick = () => {
            if (signal?.aborted) {
                finish()
                return
            }
            stableFrames = step() ? stableFrames + 1 : 0
            if (stableFrames >= STABLE_FRAMES || performance.now() > deadline) {
                finish()
                return
            }
            frame = requestAnimationFrame(tick)
        }

        signal?.addEventListener('abort', finish, { once: true })
        frame = requestAnimationFrame(tick)
    })
}

/**
 * 配列の先頭に投稿を追加する処理（DynamicScroller への prepend）の前後で、
 * window のスクロール位置を「見ている内容がそのまま」に保つ。
 *
 * vue-virtual-scroller の DynamicScroller は prepend 時のスクロール維持を
 * `shift` prop で謳っているが、`page-mode`（ウィンドウ自体をスクロール
 * コンテナにする設定）では実測すると効かないことを確認した
 * （`shift` を付けても window.scrollY が一切補正されず、追加した分だけ
 * 表示がずれ落ちる。孤立した最小構成の検証用ページでも再現した）。
 * そのため、ここで手動の補正を行う。
 *
 * @param prepend 実際に配列の先頭へ要素を足す非同期処理（channelTimelineStore.fetchOlder など）
 * @param signal 呼び出し元が補正を中断するためのシグナル
 */
export async function prependPreservingScroll(
    prepend: () => Promise<void>,
    signal?: AbortSignal,
): Promise<void> {
    const before = document.documentElement.scrollHeight
    await prepend()
    await nextTick()
    if (signal?.aborted) return

    // 追加された分をまず 1 フレーム待たずに打ち消す（待つと 1 フレームだけ跳ねて見える）
    let previousHeight = document.documentElement.scrollHeight
    const immediateDelta = previousHeight - before
    if (immediateDelta > 0) window.scrollBy(0, immediateDelta)

    // 残りは高さが後から伸びるぶん。伸びなくなるまで追従して打ち消す
    await waitUntilStable(() => {
        const current = document.documentElement.scrollHeight
        const delta = current - previousHeight
        if (delta === 0) return true
        window.scrollBy(0, delta)
        previousHeight = current
        return false
    }, signal)
}
