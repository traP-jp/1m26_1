// src/stores/authStore.ts
import { defineStore } from 'pinia'
import { oneMonthonApi } from '../lib/api/endpoints'

const STORAGE_KEY = 'access_token'

// fetchMe() の同時多重呼び出しを1本化するための in-flight promise。
// ストアはシングルトンなのでモジュールスコープに持てば十分（userStore などの
// fetchPromise と同じ考え方）。
let fetchMePromise: Promise<void> | undefined

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
            if (fetchMePromise) return fetchMePromise

            fetchMePromise = (async () => {
                try {
                    const user = await oneMonthonApi.getMe()
                    this.userId = user.id ?? null
                } catch (error) {
                    console.error('現在のユーザー情報の取得に失敗:', error)
                } finally {
                    fetchMePromise = undefined
                }
            })()

            return fetchMePromise
        },
        /**
         * userId を確実に取得してから返す。
         *
         * accessToken は localStorage から同期的に復元されるが、userId は
         * GET /api/users/me の応答を待って初めて分かる。直接 URL 遷移（ブックマーク・
         * リロード等）でページが開かれた直後はこの応答がまだ来ておらず、userId が
         * 必須な画面（プロフィールなど）がそれを待たずに「未ログイン」と誤判定して
         * しまうことがあるため、そういった画面の初期化はこちらを使うこと。
         */
        async ensureUserId(): Promise<string | null> {
            if (this.userId) return this.userId
            await this.fetchMe()
            return this.userId
        },
        logout() {
            this.setToken(null)
        },
    },
})
