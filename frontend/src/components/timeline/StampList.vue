<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStampStore } from '../../stores/stampStore'
import { useTimelineStore } from '../../stores/timelineStore'
import { traqApi } from '../../lib/api/traq'
import type { traQcomponents } from '../../types/traq'

type MessageStamp = traQcomponents['schemas']['MessageStamp']

const props = defineProps<{
    messageId: string
    stamps: MessageStamp[]
    othersCount?: number
}>()

const authStore = useAuthStore()
const stampStore = useStampStore()

// ============================================
// 1. スタンプをグループ化（表示用）
// ============================================
const groupedStamps = computed(() => {
    const groups = new Map<string, {
        stampId: string
        totalCount: number
        isPinned: boolean
        userIds: string[]
        createdAt: string // グループ内で最も古い createdAt（最初に押された日時）
    }>()

    for (const s of props.stamps) {
        const group = groups.get(s.stampId)
        if (group) {
            group.totalCount += s.count
            group.userIds.push(s.userId)
            // 最も古い createdAt を保持
            if (s.createdAt < group.createdAt) {
                group.createdAt = s.createdAt
            }
        } else {
            groups.set(s.stampId, {
                stampId: s.stampId,
                totalCount: s.count,
                isPinned: s.userId === authStore.userId,
                userIds: [s.userId],
                createdAt: s.createdAt,
            })
        }
    }

    // 自分が押しているか（グループ内に自分の userId が含まれるか）を最終決定
    for (const group of groups.values()) {
        group.isPinned = group.userIds.includes(authStore.userId!)
    }

    // 最も古い createdAt の降順でソート（新しいものほど先に表示されるようにするため）
    // もし「最初に押された順」に表示したい場合は、昇順（a - b）に変更
    return Array.from(groups.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
})

// ============================================
// 2. スタンプ操作（押す / 解除）
// ============================================
const toggleStamp = async (stampId: string) => {
    // 自分のエントリを探す
    const myEntry = props.stamps.find((s) => s.stampId === stampId && s.userId === authStore.userId)
    const pinned = !!myEntry

    // 楽観的更新用にコピー
    let updatedStamps = [...props.stamps]

    if (pinned) {
        // ★ 解除：自分の count を -1、0 になったら削除
        updatedStamps = updatedStamps
            .map((s) => {
                if (s.stampId === stampId && s.userId === authStore.userId) {
                    return { ...s, count: s.count - 1 }
                }
                return s
            })
            .filter((s) => s.count > 0)
    } else {
        // ★ 新規追加：自分がまだ押していないスタンプを追加
        const now = new Date().toISOString()
        updatedStamps.push({
            stampId: stampId,
            count: 1,
            userId: authStore.userId!,
            createdAt: now,
            updatedAt: now,
        })
    }

    // ストアを更新（即座に UI 反映）
    const timelineStore = useTimelineStore()
    timelineStore.updateMessageStamps(props.messageId, updatedStamps)

    try {
        // 実際の API リクエスト
        if (pinned) {
            await traqApi.unpinStamp(props.messageId, stampId)
        } else {
            await traqApi.pinStamp(props.messageId, stampId)
        }
        // 成功 → WebSocket イベントで最終状態に収束（モック環境ではイベントが来ないが楽観的更新で十分）
    } catch (error) {
        // 失敗したらロールバック
        console.error('スタンプ操作に失敗:', error)
        timelineStore.updateMessageStamps(props.messageId, props.stamps)
    }
}

// ============================================
// 3. スタンプメタ情報取得（stampStore 経由）
// ============================================
const getStamp = (stampId: string) => {
    return stampStore.getStamp(stampId)
}

const getStampDisplayName = (stampId: string) => {
    return stampStore.getStampDisplayName(stampId)
}

const getStampImageUrl = (stampId: string) => {
    return stampStore.getStampImageUrl(stampId)
}
</script>

<template>
    <div v-if="groupedStamps.length" class="stamp-list">
        <span
            v-for="group in groupedStamps"
            :key="group.stampId"
            class="stamp-item"
            :class="{ pinned: group.isPinned }"
            @click="toggleStamp(group.stampId)"
            role="button"
            tabindex="0"
            @keydown.enter="toggleStamp(group.stampId)"
            :aria-label="`スタンプ ${getStampDisplayName(group.stampId)} (${group.totalCount}回)`"
        >
            <!-- Unicode スタンプ -->
            <span v-if="getStamp(group.stampId)?.isUnicode" class="stamp-emoji">
                {{ getStampDisplayName(group.stampId) }}
            </span>
            <!-- カスタムスタンプ（画像） -->
            <img
                v-else-if="getStampImageUrl(group.stampId)"
                :src="getStampImageUrl(group.stampId)"
                alt="stamp"
                class="stamp-image"
                referrerpolicy="no-referrer"
                loading="lazy"
                @error="
                    (e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                    }
                "
            />
            <!-- フォールバック -->
            <span v-else class="stamp-name-fallback">
                :{{ getStamp(group.stampId)?.name || '?' }}:
            </span>
            <span class="stamp-count">{{ group.totalCount }}</span>
        </span>
    </div>
</template>

<style scoped>
/* 既存のスタイルはそのまま（変更なし） */
.stamp-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 0;
}

.stamp-item {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--surface-secondary);
    border-radius: 4px;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: var(--text-size-m);
    height: 24px;
    border: 2px solid transparent;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
}

.stamp-item:hover {
    background: var(--surface-hover, #e5e5ea);
}

.stamp-item.pinned {
    border-color: var(--stamp-pinned-color, #ffac47);
    background: var(--surface-secondary);
}

.stamp-emoji {
    font-size: 18px;
    line-height: 1;
}

.stamp-image {
    width: 20px;
    height: 20px;
    object-fit: contain;
    border-radius: 4px;
}

.stamp-name-fallback {
    font-size: var(--text-size-s);
    color: var(--text-secondary);
}

.stamp-count {
    font-size: var(--text-size-m);
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 16px;
    text-align: center;
}

.stamp-item.pinned .stamp-count {
    color: var(--stamp-pinned-color, #ffac47);
}
</style>
