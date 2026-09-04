// src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { initiateLogin } from './lib/auth'

import BookmarkView from './views/ProfileView.vue'
import TimelineView from './views/TimelineView.vue'

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
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// ============================================
// 認証ガード（遷移をキャンセルしてからリダイレクト）
// ============================================
router.beforeEach((to) => {
    const authStore = useAuthStore()

    // 認証が必要なルートで、かつコールバック（codeあり）でない場合
    if (to.meta.requiresAuth && !to.query.code && !authStore.isAuthenticated) {
        sessionStorage.setItem('login_redirect', to.fullPath)
        // リダイレクトを開始（同期的に実行）
        initiateLogin()
        // 遷移をキャンセル（これでコンポーネントはマウントされない）
        return false
    }

    return true
})

export default router
