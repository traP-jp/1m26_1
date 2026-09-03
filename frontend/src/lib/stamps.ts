// src/lib/stamps.ts
//
// スタンプには 2 つの表現がある。
//   - 集計値 (Stamps): バックエンドの /api/timeline と WebSocket の StampUpdated が返す
//     {superior: [{id, count}], othersCount}。誰が押したかは持たない。
//   - ユーザー単位 (MessageStamp[]): traQ の GET /messages/{id}/stamps が返す
//     {stampId, count, userId, createdAt, updatedAt}。(ユーザー, スタンプ) ごとに 1 要素。
//
// 描画は集計値で即座に始め、ユーザー単位の詳細が届いたらそちらに切り替える。
// その両方を同じ形（StampGroup）に均すのがこのモジュール。
import type { components } from '../gen/api-types'
import type { traQcomponents } from '../types/traq'

type MessageStamp = traQcomponents['schemas']['MessageStamp']
type Stamps = components['schemas']['Stamps']

/** Stamps.superior の最大件数（openapi.yaml の Stamps.superior maxItems と合わせる）。 */
const SUPERIOR_LIMIT = 5

/** スタンプ 1 種類ぶんの表示単位。 */
export interface StampGroup {
    stampId: string
    totalCount: number
    /** 自分が押しているか。集計値しか無い間は常に false。 */
    isPinned: boolean
    /** 誰がいつ押したか（押した回数ぶん重複する）。集計値しか無い間は空。 */
    entries: { userId: string; createdAt: string }[]
}

/**
 * ユーザー単位の詳細から表示単位を作る。
 * スタンプごとに件数を合計し、最初に押された時刻の昇順で並べる。
 */
export function groupsFromDetail(detail: MessageStamp[], myUserId: string | null): StampGroup[] {
    const groups = new Map<string, StampGroup & { createdAt: string }>()

    for (const s of detail) {
        const group = groups.get(s.stampId)
        // 押した回数ぶん entries を増やす（ツールチップは 1 回 1 アイコンで見せる）
        const entries = Array.from({ length: s.count }, () => ({
            userId: s.userId,
            createdAt: s.createdAt,
        }))

        if (group) {
            group.totalCount += s.count
            group.entries.push(...entries)
            if (s.createdAt < group.createdAt) {
                group.createdAt = s.createdAt
            }
        } else {
            groups.set(s.stampId, {
                stampId: s.stampId,
                totalCount: s.count,
                isPinned: false,
                entries,
                createdAt: s.createdAt,
            })
        }
    }

    const result = Array.from(groups.values())
    for (const group of result) {
        group.isPinned = myUserId !== null && group.entries.some((e) => e.userId === myUserId)
    }

    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

/**
 * 集計値から表示単位を作る（詳細が届くまでの暫定表示）。
 *
 * バックエンドの superior は (ユーザー, スタンプ) 単位の配列の先頭 5 件から作られており
 * 同じ id が重複しうる（backend/internal/handler/timeline.go の GetActivity）。
 * そのため必ず id でまとめて件数を合計する。並び順は superior の順を保つ。
 */
export function groupsFromAggregate(stamps: Stamps): StampGroup[] {
    const groups = new Map<string, StampGroup>()

    for (const s of stamps.superior) {
        const group = groups.get(s.id)
        if (group) {
            group.totalCount += s.count
        } else {
            groups.set(s.id, { stampId: s.id, totalCount: s.count, isPinned: false, entries: [] })
        }
    }

    return Array.from(groups.values())
}

/**
 * ユーザー単位の詳細から集計値を組み直す。
 * 楽観的更新のあと timelineStore 側の集計値も辻褄を合わせるために使う。
 */
export function aggregateFromDetail(detail: MessageStamp[]): Stamps {
    const totals = new Map<string, number>()
    for (const s of detail) {
        totals.set(s.stampId, (totals.get(s.stampId) ?? 0) + s.count)
    }

    const sorted = Array.from(totals.entries()).sort(([, a], [, b]) => b - a)
    const superior = sorted.slice(0, SUPERIOR_LIMIT).map(([id, count]) => ({ id, count }))
    const othersCount = sorted.slice(SUPERIOR_LIMIT).reduce((sum, [, count]) => sum + count, 0)

    return othersCount > 0 ? { superior, othersCount } : { superior }
}

/**
 * 自分のスタンプを 1 つ足した詳細を返す（元の配列は変更しない）。
 * 既に押していれば count を増やす — traQ も同じスタンプの重ね押しを許す。
 */
export function addStampToDetail(
    detail: MessageStamp[],
    stampId: string,
    userId: string,
): MessageStamp[] {
    const mine = detail.find((s) => s.stampId === stampId && s.userId === userId)
    if (mine) {
        return detail.map((s) =>
            s.stampId === stampId && s.userId === userId ? { ...s, count: s.count + 1 } : s,
        )
    }

    const now = new Date().toISOString()
    return [...detail, { stampId, count: 1, userId, createdAt: now, updatedAt: now }]
}

/**
 * 自分のスタンプを取り除いた詳細を返す（元の配列は変更しない）。
 * traQ の unpinStamp は自分の押下をまとめて消すので、重ね押しぶんも一度に消える。
 */
export function removeStampFromDetail(
    detail: MessageStamp[],
    stampId: string,
    userId: string,
): MessageStamp[] {
    return detail.filter((s) => !(s.stampId === stampId && s.userId === userId))
}

/** 自分がそのスタンプを押しているか。 */
export function hasMyStamp(
    detail: MessageStamp[],
    stampId: string,
    userId: string | null,
): boolean {
    return userId !== null && detail.some((s) => s.stampId === stampId && s.userId === userId)
}

/** そのスタンプを自分以外の誰かが押しているか（削除アニメーションの出し分けに使う）。 */
export function hasOtherUsersStamp(
    detail: MessageStamp[],
    stampId: string,
    userId: string | null,
): boolean {
    return detail.some((s) => s.stampId === stampId && s.userId !== userId)
}
