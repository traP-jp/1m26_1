// src/stores/authStore.ts
import { defineStore } from 'pinia'
import { oneMonthonApi } from '../lib/api/endpoints'

const STORAGE_KEY = 'access_token'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        accessToken: localStorage.getItem(STORAGE_KEY) || null,
        userId: null as string | null, // ユーザーUUID
    }),
    getters: {
        isAuthenticated: (state) => !!state.accessToken,
    },
    actions: {
        setToken(token: string | null) {
            this.accessToken = token
            if (token) {
                localStorage.setItem(STORAGE_KEY, token)
                this.fetchMe()
            } else {
                localStorage.removeItem(STORAGE_KEY)
                this.userId = null
            }
        },
        async fetchMe() {
            if (!this.accessToken) return
            try {
                const user = await oneMonthonApi.getMe()
                this.userId = user.id ?? null
            } catch (error) {
                console.error('現在のユーザー情報の取得に失敗:', error)
            }
        },
        logout() {
            this.setToken(null)
        },
    },
})
