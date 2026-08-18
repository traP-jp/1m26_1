import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { startMockWorker } from './mocks'

import App from './App.vue'
import router from './router'
import './styles/main.css'

async function bootstrap() {
    await startMockWorker()

    createApp(App).use(createPinia()).use(router).mount('#app')
}

void bootstrap()
