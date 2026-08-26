// src/stores/stampStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

export const useStampStore = defineStore('stamp', () => {
    const stamps = ref<Map<string, Stamp>>(new Map())
    const isLoading = ref(false)
    let fetchPromise: Promise<void> | undefined

    // 検索キャッシュ（クエリ → スタンプID配列）
    const searchCache = ref<Map<string, string[]>>(new Map())

    const fetchStamps = async () => {
        if (stamps.value.size > 0) return
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        fetchPromise = traqApi
            .getStamps()
            .then((stampList) => {
                stamps.value = new Map(stampList.map((stamp) => [stamp.id, stamp]))
                // 検索キャッシュをクリア（データ更新時）
                searchCache.value.clear()
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getStamp = (stampId: string): Stamp | undefined => {
        return stamps.value.get(stampId)
    }

    const getStampDisplayName = (stampId: string): string => {
        const stamp = getStamp(stampId)
        if (!stamp) return '?'
        if (stamp.isUnicode) {
            return stamp.name
        }
        return `:${stamp.name}:`
    }

    const getStampImageUrl = (stampId: string, size = 24): string => {
        const stamp = getStamp(stampId)
        if (!stamp || stamp.isUnicode) return ''
        return `https://image-proxy.trap.jp/stamp/${stampId}?width=${size}&height=${size}`
    }

    // インクリメンタルサーチ（キャッシュ付き）
    const searchStamps = (query: string): Stamp[] => {
        if (!query.trim()) {
            return Array.from(stamps.value.values())
        }
        const key = query.trim().toLowerCase()
        if (searchCache.value.has(key)) {
            const ids = searchCache.value.get(key)!
            return ids.map((id) => stamps.value.get(id)).filter(Boolean) as Stamp[]
        }

        const results = Array.from(stamps.value.values()).filter((stamp) =>
            stamp.name.toLowerCase().includes(key)
        )
        searchCache.value.set(key, results.map((s) => s.id))
        return results
    }

    // ★ 新規追加: よく使うスタンプ（履歴から取得）
    const fetchFrequentlyUsed = async (limit = 20): Promise<Stamp[]> => {
        // GET /users/me/stamp-history が存在する場合の実装
        // ここでは仮実装（stampStore に履歴管理を別途持っても良い）
        // 現状は単に全スタンプから人気順を返すなどでも可
        // 今回は簡単のため、全スタンプから先頭limit件を返す
        await fetchStamps()
        return Array.from(stamps.value.values()).slice(0, limit)
    }

    return {
        stamps,
        isLoading,
        fetchStamps,
        getStamp,
        getStampDisplayName,
        getStampImageUrl,
        searchStamps,
        fetchFrequentlyUsed,
    }
})
