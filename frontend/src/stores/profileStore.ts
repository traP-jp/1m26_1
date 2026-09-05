// src/stores/profileStore.ts
//
// プロフィール画面の「記録」タブで使う統計値。
// traQ には期間指定の統計 API が無いため、メッセージ検索を組み合わせて自前で集計する
// （frontend/src/lib/api/traq.ts の searchMessages。詳細は ProfileView.vue のコメント参照）。
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import { totalStampCount } from '../lib/stamps'
import { API_CONCURRENCY, mapWithConcurrency } from '../lib/concurrency'
import { useAuthStore } from './authStore'
import type { traQcomponents } from '../types/traq'

type User = traQcomponents['schemas']['UserDetail']

// もらったスタンプの集計に使う検索の 1 ページあたりの件数
const STAMP_PAGE_SIZE = 100
// 1 期間あたりに叩くページ数の上限（= 最大 500 投稿ぶんまでは正確に集計する）。
// これを超える投稿がある期間は、上限までの集計値に切り詰めて isApproximate を立てる。
const MAX_STAMP_PAGES = 5

const daysAgo = (days: number): Date => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
}

interface StampRangeResult {
    count: number
    /** ページ数の上限に達し、集計を打ち切ったか */
    approximate: boolean
}

/**
 * 指定期間に投稿されたユーザー自身のメッセージについた、スタンプの総押下数を集計する。
 * @param totalHits - 事前に取得済みの、この期間の投稿件数（searchMessages の limit:1 の結果）
 */
async function fetchReceivedStampCount(
    userId: string,
    after: string | undefined,
    before: string | undefined,
    totalHits: number,
): Promise<StampRangeResult> {
    if (totalHits === 0) return { count: 0, approximate: false }

    const pageCount = Math.min(Math.ceil(totalHits / STAMP_PAGE_SIZE), MAX_STAMP_PAGES)
    const offsets = Array.from({ length: pageCount }, (_, i) => i * STAMP_PAGE_SIZE)

    const results = await mapWithConcurrency(offsets, API_CONCURRENCY, (offset) =>
        traqApi.searchMessages({ from: [userId], after, before, limit: STAMP_PAGE_SIZE, offset }),
    )

    let count = 0
    for (const result of results) {
        if (result.status === 'fulfilled') {
            for (const message of result.value.hits) {
                count += totalStampCount(message.stamps)
            }
        } else {
            console.error('スタンプ集計用のメッセージ取得に失敗:', result.reason)
        }
    }

    return { count, approximate: pageCount * STAMP_PAGE_SIZE < totalHits }
}

/** current を previous と比べた変化率（%）。previous が 0 または未取得なら null（表示しない）。 */
const computeDelta = (current: number | null, previous: number | null): number | null => {
    if (current === null || previous === null || previous === 0) return null
    return ((current - previous) / previous) * 100
}

export const useProfileStore = defineStore('profile', () => {
    const me = ref<User | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const allTimePosts = ref<number | null>(null)
    const weekPosts = ref<number | null>(null)
    const prevWeekPosts = ref<number | null>(null)
    const weekStamps = ref<number | null>(null)
    const prevWeekStamps = ref<number | null>(null)
    /** もらったスタンプの集計が、ページ数上限により正確でない可能性があるか */
    const stampsApproximate = ref(false)

    let fetchPromise: Promise<void> | undefined

    const postsDelta = computed(() => computeDelta(weekPosts.value, prevWeekPosts.value))
    const stampsDelta = computed(() => computeDelta(weekStamps.value, prevWeekStamps.value))

    const fetchProfile = async (): Promise<void> => {
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        error.value = null

        const authStore = useAuthStore()
        // accessToken は localStorage から同期復元されるが userId は非同期取得のため、
        // 直接 URL 遷移した直後は authStore.userId がまだ null なことがある。
        // ensureUserId() で解決を待ってから使う。
        const userId = await authStore.ensureUserId()
        if (!userId) {
            error.value = 'ユーザー情報が取得できていません（未ログイン）'
            isLoading.value = false
            return
        }

        fetchPromise = (async () => {
            const weekAgo = daysAgo(7).toISOString()
            const twoWeeksAgo = daysAgo(14).toISOString()

            const [meResult, allTimeResult, weekResult, prevWeekResult] = await Promise.all([
                traqApi.getMe(),
                traqApi.searchMessages({ from: [userId], limit: 1 }),
                traqApi.searchMessages({ from: [userId], after: weekAgo, limit: 1 }),
                traqApi.searchMessages({
                    from: [userId],
                    after: twoWeeksAgo,
                    before: weekAgo,
                    limit: 1,
                }),
            ])

            me.value = meResult
            allTimePosts.value = allTimeResult.totalHits
            weekPosts.value = weekResult.totalHits
            prevWeekPosts.value = prevWeekResult.totalHits

            const [weekStampResult, prevWeekStampResult] = await Promise.all([
                fetchReceivedStampCount(userId, weekAgo, undefined, weekResult.totalHits),
                fetchReceivedStampCount(userId, twoWeeksAgo, weekAgo, prevWeekResult.totalHits),
            ])

            weekStamps.value = weekStampResult.count
            prevWeekStamps.value = prevWeekStampResult.count
            stampsApproximate.value = weekStampResult.approximate || prevWeekStampResult.approximate
        })()

        try {
            await fetchPromise
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'プロフィールの取得に失敗しました'
            console.error('fetchProfile error:', err)
        } finally {
            isLoading.value = false
            fetchPromise = undefined
        }
    }

    return {
        me,
        isLoading,
        error,
        allTimePosts,
        weekPosts,
        prevWeekPosts,
        weekStamps,
        prevWeekStamps,
        stampsApproximate,
        postsDelta,
        stampsDelta,
        fetchProfile,
    }
})
