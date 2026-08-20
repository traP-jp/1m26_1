import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { startMockWorker } from './mocks'
import './styles/main.css'

async function bootstrap() {
  // MSW の起動（開発時のみ）
  await startMockWorker()

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // 初期ナビゲーション完了を待ってからマウント
  await router.isReady()

  app.mount('#app')
}

bootstrap()
