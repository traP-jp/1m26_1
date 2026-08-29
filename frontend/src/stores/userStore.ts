// src/stores/userStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type User = traQcomponents['schemas']['UserDetail']

export const useUserStore = defineStore('user', () => {
    // id → User のマップ
    const users = ref<Map<string, User>>(new Map())
    const isLoading = ref(false)
    let fetchPromise: Promise<void> | undefined

    const fetchUsers = async () => {
        if (users.value.size > 0) return
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        fetchPromise = traqApi
            .getUsers()
            .then((userList) => {
                users.value = new Map(userList.map((user) => [user.id, user]))
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getUser = (userId: string): User | undefined => {
        return users.value.get(userId)
    }

    // 表示名を取得（なければIDの先頭8文字）
    const getUserName = (userId: string): string => {
        return users.value.get(userId)?.displayName || userId.slice(0, 8)
    }

    // アイコンURLを生成（username を使用）
    const getIconUrl = (userId: string): string => {
        const user = users.value.get(userId)
        if (user?.name) {
            return `https://image-proxy.trap.jp/icon/${user.name}?width=64&height=64`
        }
        return '' // デフォルトアイコン（必要に応じて設定）
    }

    const getUserIconByName = (name: string): string | null => {
        for (const [, user] of users.value) {
            if (user.name === name) {
                return `https://image-proxy.trap.jp/icon/${user.name}?width=64&height=64`
            }
        }
        return null
    }

    return { users, isLoading, fetchUsers, getUser, getUserName, getIconUrl, getUserIconByName }
})
