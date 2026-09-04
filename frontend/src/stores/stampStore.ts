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
        return `:${stamp.name}:`
    }

    const getStampIdByName = (name: string): string | null => {
        for (const [id, stamp] of stamps.value) {
            if (stamp.name === name) return id
        }
        return null
    }

    const getStampImageUrl = (stampId: string, size = 48, format = 'webp'): string => {
        const stamp = getStamp(stampId)
        if (!stamp) return ''
        return `https://image-proxy.trap.jp/stamp/${stampId}?width=${size}&height=${size}&format=${format}`
    }

    /**
     * 検索クエリに対するマッチングスコアを計算
     * 4: 完全一致
     * 3: 前方一致
     * 2: 後方一致
     * 1: 部分一致
     * 0: 不一致（検索結果から除外）
     */
    const getMatchScore = (name: string, query: string): number => {
        const lowerName = name.toLowerCase()
        const lowerQuery = query.toLowerCase()

        if (lowerName === lowerQuery) return 4
        if (lowerName.startsWith(lowerQuery)) return 3
        if (lowerName.endsWith(lowerQuery)) return 2
        if (lowerName.includes(lowerQuery)) return 1
        return 0
    }

    /**
     * スタンプを検索スコアの降順でソート
     */
    const sortBySearchPriority = (stamps: Stamp[], query: string): Stamp[] => {
        const lowerQuery = query.toLowerCase()
        return [...stamps].sort((a, b) => {
            const scoreA = getMatchScore(a.name, lowerQuery)
            const scoreB = getMatchScore(b.name, lowerQuery)
            return scoreB - scoreA // 降順（スコアが高い順）
        })
    }

    //インクリメンタルサーチ（キャッシュ付き + 優先順位ソート）
    const searchStamps = (query: string): Stamp[] => {
        const trimmed = query.trim()

        // 空クエリの場合は全スタンプをデフォルト順（ID順）で返す
        if (!trimmed) {
            return Array.from(stamps.value.values())
        }

        const key = trimmed.toLowerCase()

        // キャッシュチェック
        if (searchCache.value.has(key)) {
            const ids = searchCache.value.get(key)!
            const filtered = ids
                .map((id) => stamps.value.get(id))
                .filter((s): s is Stamp => s !== undefined)
            return sortBySearchPriority(filtered, trimmed)
        }

        // フィルタリング（部分一致で絞り込み）
        const results = Array.from(stamps.value.values()).filter((stamp) =>
            stamp.name.toLowerCase().includes(key),
        )

        // キャッシュにIDリストを保存
        searchCache.value.set(
            key,
            results.map((s) => s.id),
        )

        // 優先順位でソートして返す
        return sortBySearchPriority(results, trimmed)
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
        getStampIdByName,
        getMatchScore,
        sortBySearchPriority,
        getStampImageUrl,
        searchStamps,
        fetchFrequentlyUsed,
    }
})
