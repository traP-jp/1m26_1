// src/lib/stamps.ts
//
// バックエンドの /api/timeline は message.stamps として
// (ユーザー, スタンプ) ごとの押下 1 件 1 要素の配列 ({stampId, userId, count, createdAt, updatedAt})
// をそのまま返す（backend/internal/handler/timeline.go の GetActivity・openapi.yaml の Stamp）。
// 誰が押したかを持つ生データなので、traQ への追加フェッチなしにグルーピングだけすればよい。
import type { components } from '../gen/api-types'

type Stamp = components['schemas']['Stamp']

/** スタンプ 1 種類ぶんの表示単位。 */
export interface StampGroup {
    stampId: string
    totalCount: number
    /** 自分が押しているか。 */
    isPinned: boolean
    /** 誰がいつ押したか（押した回数ぶん重複する）。 */
    entries: { userId: string; createdAt: string }[]
}

// この配列は入力の型を Stamp[] と書いているが、実際には store 越しの UI 由来の値で
// TypeScript の型チェックをすり抜けうる（例: 開発中の HMR で Pinia の state が
// 旧 API 形状のまま残る、将来また API 形状が変わる等）。1 メッセージぶんの異常データで
// DynamicScroller ごとクラッシュさせないよう、各関数の入り口で配列であることだけは確認する。
const toStampArray = (stamps: Stamp[]): Stamp[] => {
    if (!Array.isArray(stamps)) {
        console.warn(
            'stamps が配列ではありません（型が古いまま残っていないか確認してください）:',
            stamps,
        )
        return []
    }
    return stamps
}

/**
 * (ユーザー, スタンプ) 単位の配列から表示単位を作る。
 * スタンプごとに件数を合計し、最初に押された時刻の昇順で並べる。
 */
export function groupStamps(stamps: Stamp[], myUserId: string | null): StampGroup[] {
    const groups = new Map<string, StampGroup & { createdAt: string }>()

    for (const s of toStampArray(stamps)) {
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
 * 自分のスタンプを 1 つ足した配列を返す（元の配列は変更しない）。
 * 既に押していれば count を増やす — traQ も同じスタンプの重ね押しを許す。
 */
export function addStamp(stampsInput: Stamp[], stampId: string, userId: string): Stamp[] {
    const stamps = toStampArray(stampsInput)
    const mine = stamps.find((s) => s.stampId === stampId && s.userId === userId)
    if (mine) {
        return stamps.map((s) =>
            s.stampId === stampId && s.userId === userId ? { ...s, count: s.count + 1 } : s,
        )
    }

    const now = new Date().toISOString()
    return [...stamps, { stampId, count: 1, userId, createdAt: now, updatedAt: now }]
}

/**
 * 自分のスタンプを取り除いた配列を返す（元の配列は変更しない）。
 * traQ の unpinStamp は自分の押下をまとめて消すので、重ね押しぶんも一度に消える。
 */
export function removeStamp(stamps: Stamp[], stampId: string, userId: string): Stamp[] {
    return toStampArray(stamps).filter((s) => !(s.stampId === stampId && s.userId === userId))
}

/** 自分がそのスタンプを押しているか。 */
export function hasMyStamp(stamps: Stamp[], stampId: string, userId: string | null): boolean {
    return (
        userId !== null &&
        toStampArray(stamps).some((s) => s.stampId === stampId && s.userId === userId)
    )
}

/** そのスタンプを自分以外の誰かが押しているか（削除アニメーションの出し分けに使う）。 */
export function hasOtherUsersStamp(
    stamps: Stamp[],
    stampId: string,
    userId: string | null,
): boolean {
    return toStampArray(stamps).some((s) => s.stampId === stampId && s.userId !== userId)
}

/** メッセージに付いたスタンプの総押下数（popularity と同じ定義。楽観的更新後の再計算に使う）。 */
export function totalStampCount(stamps: Stamp[]): number {
    return toStampArray(stamps).reduce((sum, s) => sum + s.count, 0)
}
