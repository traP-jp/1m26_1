import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// MSW ワーカーをセットアップ
export const worker = setupWorker(...handlers)
