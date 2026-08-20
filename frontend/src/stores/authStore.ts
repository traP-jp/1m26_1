// src/stores/authStore.ts
import { defineStore } from 'pinia'

const STORAGE_KEY = 'access_token'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        accessToken: localStorage.getItem(STORAGE_KEY) || null,
    }),
    getters: {
        // 認証状態を判定するゲッター
        isAuthenticated: (state) => !!state.accessToken,
    },
    actions: {
        setToken(token: string | null) {
            this.accessToken = token
            if (token) {
                localStorage.setItem(STORAGE_KEY, token)
            } else {
                localStorage.removeItem(STORAGE_KEY)
            }
        },
        logout() {
            this.setToken(null)
        },
    },
})
