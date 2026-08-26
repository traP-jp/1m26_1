<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStampStore } from '../../stores/stampStore'
import { useTimelineStore } from '../../stores/timelineStore'
import { traqApi } from '../../lib/api/traq'
import StampTooltip from './StampTooltip.vue'
import type { traQcomponents } from '../../types/traq'

type MessageStamp = traQcomponents['schemas']['MessageStamp']

const props = defineProps<{
    messageId: string
    stamps: MessageStamp[]
    othersCount?: number
}>()

const authStore = useAuthStore()
const stampStore = useStampStore()
const timelineStore = useTimelineStore()

// ============================================
// 1. スタンプをグループ化（表示用）
// ============================================
const groupedStamps = computed(() => {
    const groups = new Map<
        string,
        {
            stampId: string
            totalCount: number
            isPinned: boolean
            entries: { userId: string; createdAt: string }[]
            createdAt: string
        }
    >()

    for (const s of props.stamps) {
        const group = groups.get(s.stampId)
        if (group) {
            group.totalCount += s.count
            // ★ count 回分 entries に追加
            for (let i = 0; i < s.count; i++) {
                group.entries.push({ userId: s.userId, createdAt: s.createdAt })
            }
            if (s.createdAt < group.createdAt) {
                group.createdAt = s.createdAt
            }
        } else {
            groups.set(s.stampId, {
                stampId: s.stampId,
                totalCount: s.count,
                isPinned: s.userId === authStore.userId,
                entries: Array.from({ length: s.count }, () => ({
                    userId: s.userId,
                    createdAt: s.createdAt,
                })),
                createdAt: s.createdAt,
            })
        }
    }

    for (const group of groups.values()) {
        group.isPinned = group.entries.some((e) => e.userId === authStore.userId)
    }

    return Array.from(groups.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
})

// ============================================
// 2. ホバー状態管理（stampId のみ保持）
// ============================================
const hoveredStampId = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

const hoveredGroup = computed(() => {
    if (!hoveredStampId.value) return null
    return groupedStamps.value.find((g) => g.stampId === hoveredStampId.value) ?? null
})

const onMouseEnter = (group: (typeof groupedStamps.value)[0], event: MouseEvent) => {
    hoveredStampId.value = group.stampId
    tooltipPosition.value = {
        x: event.clientX + 12,
        y: event.clientY - 10,
    }
}

const onMouseLeave = () => {
    hoveredStampId.value = null
}

// ============================================
// 3. スタンプ操作（押す / 解除）
// ============================================
const toggleStamp = async (stampId: string) => {
    const myEntry = props.stamps.find((s) => s.stampId === stampId && s.userId === authStore.userId)
    const pinned = !!myEntry

    let updatedStamps = [...props.stamps]

    if (pinned) {
        updatedStamps = updatedStamps
            .map((s) => {
                if (s.stampId === stampId && s.userId === authStore.userId) {
                    return { ...s, count: s.count - 1 }
                }
                return s
            })
            .filter((s) => s.count > 0)
    } else {
        const now = new Date().toISOString()
        updatedStamps.push({
            stampId: stampId,
            count: 1,
            userId: authStore.userId!,
            createdAt: now,
            updatedAt: now,
        })
    }

    timelineStore.updateMessageStamps(props.messageId, updatedStamps)

    try {
        if (pinned) {
            await traqApi.unpinStamp(props.messageId, stampId)
        } else {
            await traqApi.pinStamp(props.messageId, stampId)
        }
    } catch (error) {
        console.error('スタンプ操作に失敗:', error)
        timelineStore.updateMessageStamps(props.messageId, props.stamps)
    }
}

// ============================================
// 4. スタンプメタ情報取得（stampStore 経由）
// ============================================
const getStamp = (stampId: string) => stampStore.getStamp(stampId)
const getStampDisplayName = (stampId: string) => stampStore.getStampDisplayName(stampId)
const getStampImageUrl = (stampId: string) => stampStore.getStampImageUrl(stampId)

const emit = defineEmits<{
    (e: 'open-palette', messageId: string): void
}>()

const openPalette = () => {
    emit('open-palette', props.messageId)
}
</script>

<template>
    <div class="stamp-list">
        <span
            v-for="group in groupedStamps"
            :key="group.stampId"
            class="stamp-item"
            :class="{ pinned: group.isPinned }"
            @click="toggleStamp(group.stampId)"
            @mouseenter="onMouseEnter(group, $event)"
            @mouseleave="onMouseLeave"
            role="button"
            tabindex="0"
            @keydown.enter="toggleStamp(group.stampId)"
            :aria-label="`スタンプ ${getStampDisplayName(group.stampId)} (${group.totalCount}回)`"
        >
            <span v-if="getStamp(group.stampId)?.isUnicode" class="stamp-emoji">
                {{ getStampDisplayName(group.stampId) }}
            </span>
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
            <span v-else class="stamp-name-fallback">
                :{{ getStamp(group.stampId)?.name || '?' }}:
            </span>
            <span class="stamp-count">{{ group.totalCount }}</span>
        </span>

        <!-- ＋ボタン（スタンプパレットを開く） -->
        <button
            class="stamp-add-button"
            @click="openPalette"
            aria-label="スタンプを追加"
            type="button"
        >
            <span class="add-icon">+</span>
        </button>

        <!-- ツールチップコンポーネントを呼び出し -->
        <StampTooltip
            v-if="hoveredGroup"
            :stamp-id="hoveredGroup.stampId"
            :entries="hoveredGroup.entries"
            :position="tooltipPosition"
        />
    </div>
</template>

<style scoped>
.stamp-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px 0;
    position: relative;
}

.stamp-item {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--surface-secondary);
    border-radius: 4px;
    padding: 2px 4px;
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

.stamp-add-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 2px solid var(--surface-border, #d0d0d0);
    background: var(--surface-secondary, #f5f5f7);
    color: var(--text-secondary, #8e8e93);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    flex-shrink: 0;
    line-height: 1;
    position: relative;
}

/* ホバー時 */
.stamp-add-button:hover {
    border-color: var(--accent-color, #ffac47);
    color: var(--accent-color, #ffac47);
    background: var(--surface-hover, #e8f3fd);
    transform: scale(1.05);
}

/* クリック時 */
.stamp-add-button:active {
    transform: scale(0.92);
}

/* アイコン */
.add-icon {
    width: 100%;
    height: 100%;
    text-align: center;
    display: inline-block;
    font-size: 20px;
    font-weight: 300;
    line-height: 1;
    transform-origin: center;
}
</style>
