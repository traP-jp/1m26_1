// 開発環境でのみ MSW を起動するためのエントリーポイント
export const startMockWorker = async () => {
    if (import.meta.env.DEV && import.meta.env.VITE_API_MOCKING !== 'false') {
        const { worker } = await import('./browser')
        return worker.start({
            onUnhandledRequest: 'bypass', // 未定義のリクエストは実際のネットワークに流す
        })
    }
    return Promise.resolve()
}
