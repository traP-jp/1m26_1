import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import App from './App.vue'
import router from './router'
import { startMockWorker } from './mocks'
import './styles/main.css'

async function bootstrap() {
    await startMockWorker()

    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)
    app.use(VueVirtualScroller)

    await router.isReady()
    app.mount('#app')
}

bootstrap()
