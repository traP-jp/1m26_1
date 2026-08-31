import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// MSW ワーカーをセットアップ
// @ts-expect-error WebSocketLink は AnyHandler に含まれないが実行時は問題なし
export const worker = setupWorker(...handlers)
