/**
 * items を最大 limit 個ずつ並列で処理する。入力順を保った結果配列を返す。
 *
 * ブラウザは 1 ホストあたりの同時接続数を絞る（Chrome は 6）ため、
 * 数百〜数千件を素朴な Promise.all で投げると ERR_INSUFFICIENT_RESOURCES や
 * traQ 側の 429（レートリミット）を引き起こす。API のファンアウトはこれで包む。
 *
 * 例:
 *   const results = await mapWithConcurrency(ids, 6, (id) => traqApi.getMessage(id))
 *   for (const r of results) {
 *       if (r.status === 'fulfilled') use(r.value)
 *   }
 */
/**
 * traQ API へのファンアウト時の既定の同時実行数。
 * ブラウザの 1 ホストあたり同時接続数上限（Chrome は 6）に合わせている。
 */
export const API_CONCURRENCY = 6

export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = Array.from({ length: items.length })
    const workerCount = Math.max(1, Math.min(limit, items.length))
    let cursor = 0

    const runWorker = async (): Promise<void> => {
        while (cursor < items.length) {
            const index = cursor++
            try {
                results[index] = { status: 'fulfilled', value: await fn(items[index] as T, index) }
            } catch (reason) {
                results[index] = { status: 'rejected', reason }
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, runWorker))
    return results
}
