// src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { initiateLogin } from './lib/auth'

import BookmarkView from './views/ProfileView.vue'
import TimelineView from './views/TimelineView.vue'
import MessageDetailView from './views/MessageDetailView.vue'

const routes = [
    {
        path: '/',
        name: 'timeline',
        component: TimelineView,
        meta: { requiresAuth: true },
    },
    {
        path: '/profile',
        name: 'profile',
        component: BookmarkView,
        meta: { requiresAuth: true },
    },
    {
        path: '/messages/:messageId',
        name: 'message-detail',
        component: MessageDetailView,
        meta: { requiresAuth: true },
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    // 詳細ビューは中心投稿へ自前でスクロール位置を合わせるので、ルーターには触らせない。
    // タイムラインへ戻ったときは KeepAlive で保持されたスクロール位置を復元する
    // （再アタッチが 1 tick 遅れるため、savedPosition をそのまま返さず遅延させる）。
    scrollBehavior(to, _from, savedPosition) {
        if (to.name === 'message-detail') {
            return false
        }
        if (savedPosition) {
            return new Promise((resolve) => {
                setTimeout(() => resolve(savedPosition), 0)
            })
        }
        return { top: 0 }
    },
})

// ============================================
// 認証ガード（遷移をキャンセルしてからリダイレクト）
// ============================================
router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    // 認証が必要なルートで、かつコールバック（codeあり）でない場合
    if (to.meta.requiresAuth && !to.query.code && !authStore.isAuthenticated) {
        sessionStorage.setItem('login_redirect', to.fullPath)
        try {
            // リダイレクトを開始（traQ 側へブラウザごと遷移する）
            await initiateLogin()
            // 遷移をキャンセル（これでコンポーネントはマウントされない）
            return false
        } catch (error) {
            // サーキットブレーカーが作動した場合など、traQ への
            // リダイレクトを行わない。ルートはそのまま表示させ、
            // コンポーネント側にエラー表示を任せる。
            console.error('ログインへのリダイレクトを中止しました:', error)
            return true
        }
    }

    return true
})

export default router
