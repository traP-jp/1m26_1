<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStampStore } from '../../stores/stampStore'
import { useTimelineStore } from '../../stores/timelineStore'
import { useMessageStampStore } from '../../stores/messageStampStore'
import { traqApi } from '../../lib/api/traq'
import {
    addStampToDetail,
    groupsFromAggregate,
    groupsFromDetail,
    hasMyStamp,
    hasOtherUsersStamp,
    removeStampFromDetail,
} from '../../lib/stamps'
import StampTooltip from './StampTooltip.vue'
import type { components } from '../../gen/api-types'

type Stamps = components['schemas']['Stamps']

const props = defineProps<{
    messageId: string
    stamps: Stamps
}>()

const authStore = useAuthStore()
const stampStore = useStampStore()
const timelineStore = useTimelineStore()
const messageStampStore = useMessageStampStore()

// ============================================
// 1. スタンプをグループ化（表示用）
// ============================================
// バックエンドの集計値は「誰が押したか」を持たないので、
// ユーザー単位の詳細を traQ から遅延取得し、届いたらそちらに切り替える。
// onMounted ではなく watch にしているのは、仮想化でコンポーネントが
// 使い回されると onMounted がインスタンスにつき 1 回しか発火しないため。
watch(
    () => props.messageId,
    (messageId) => {
        void messageStampStore.ensureStamps(messageId)
    },
    { immediate: true },
)

const detail = computed(() => messageStampStore.getStamps(props.messageId))
const isHydrated = computed(() => detail.value !== undefined)

const groupedStamps = computed(() =>
    detail.value
        ? groupsFromDetail(detail.value, authStore.userId)
        : groupsFromAggregate(props.stamps),
)

// 詳細が届けば全スタンプを描けるので、「+N」は集計値だけの間しか出さない
const hiddenCount = computed(() => (isHydrated.value ? 0 : (props.stamps.othersCount ?? 0)))

// ============================================
// 2. ホバー状態管理（stampId のみ保持）
// ============================================
const hoveredStampId = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches
const addAnimationStampId = computed(() => timelineStore.addAnimationStampId)
const removeAnimationStampId = computed(() => timelineStore.removeAnimationStampId)

const hoveredGroup = computed(() => {
    if (!hoveredStampId.value) return null
    return groupedStamps.value.find((g) => g.stampId === hoveredStampId.value) ?? null
})

const onMouseEnter = (group: (typeof groupedStamps.value)[0], event: MouseEvent) => {
    if (!isHoverCapable) return null
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
    const userId = authStore.userId
    if (!userId) return

    // 押す / 外すの判定にはユーザー単位の詳細が要る。
    // 通常は表示時のハイドレートで既に揃っているが、間に合っていなければ待つ。
    await messageStampStore.ensureStamps(props.messageId)
    const before = messageStampStore.getStamps(props.messageId)
    if (!before) return

    // 楽観的更新。commitDetail が詳細と集計値の両方を進めるので、
    // 失敗したら更新前の詳細をそのまま渡し直せば戻る
    const commit = (next: typeof before) => messageStampStore.commitDetail(props.messageId, next)
    const rollback = () => commit(before)

    if (hasMyStamp(before, stampId, userId)) {
        const performRemove = async () => {
            commit(removeStampFromDetail(before, stampId, userId))
            try {
                await traqApi.unpinStamp(props.messageId, stampId)
            } catch (error) {
                console.error('スタンプ解除に失敗:', error)
                rollback()
            }
        }

        // 自分しか押していないならスタンプ自体が消えるので、消えるアニメーションを先に見せる
        if (hasOtherUsersStamp(before, stampId, userId)) {
            void performRemove()
        } else {
            timelineStore.triggerRemoveStampAnimation(stampId)
            window.setTimeout(() => {
                void performRemove()
            }, 200)
        }

        return
    }

    commit(addStampToDetail(before, stampId, userId))

    try {
        await traqApi.pinStamp(props.messageId, stampId)
    } catch (error) {
        console.error('スタンプ追加に失敗:', error)
        rollback()
    }
}

// ============================================
// 4. スタンプメタ情報取得（stampStore 経由）
// ============================================
const getStamp = (stampId: string) => stampStore.getStamp(stampId)
const getStampDisplayName = (stampId: string) => stampStore.getStampDisplayName(stampId)
const getStampImageUrl = (stampId: string) => stampStore.getStampImageUrl(stampId)

const emit = defineEmits<{
    (e: 'open-palette', messageId: string, position: { x: number; y: number }): void
}>()

const openPalette = (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    emit('open-palette', props.messageId, {
        x: rect.left,
        y: rect.bottom, // ボタンの下端を基準にする
    })
}
</script>

<template>
    <div class="stamp-list">
        <span
            v-for="group in groupedStamps"
            :key="group.stampId"
            class="stamp-item"
            :class="{
                pinned: group.isPinned,
                'stamp-item--added': addAnimationStampId === group.stampId,
                'stamp-item--removed': removeAnimationStampId === group.stampId,
            }"
            @click="toggleStamp(group.stampId)"
            @mouseenter="onMouseEnter(group, $event)"
            @mouseleave="onMouseLeave"
            role="button"
            tabindex="0"
            @keydown.enter="toggleStamp(group.stampId)"
            :aria-label="`スタンプ ${getStampDisplayName(group.stampId)} (${group.totalCount}回)`"
        >
            <img
                v-if="getStampImageUrl(group.stampId)"
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

        <!-- 集計値しか無い間は、上位 5 件に入らなかったぶんを件数だけで示す -->
        <span
            v-if="hiddenCount > 0"
            class="stamp-others"
            :aria-label="`ほかに ${hiddenCount} 件のスタンプ`"
        >
            +{{ hiddenCount }}
        </span>

        <!-- ＋ボタン（スタンプパレットを開く） -->
        <button
            class="stamp-add-button"
            @click="openPalette($event)"
            aria-label="スタンプを追加"
            type="button"
        >
            <svg
                class="add-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <line x1="12" y1="4" x2="12" y2="20" />
                <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
        </button>

        <!-- ツールチップコンポーネントを呼び出し -->
        <StampTooltip
            v-if="hoveredGroup"
            :stamp-id="hoveredGroup.stampId"
            :entries="hoveredGroup.entries"
            :total-count="hoveredGroup.totalCount"
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
    background: #fbe0bb;
}

.stamp-item--added {
    animation: fadeInAndMoveUp 0.2s ease-out both;
}

.stamp-item--removed {
    animation: fadeOutAndMoveDown 0.2s ease-in both;
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

.stamp-others {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-secondary);
    font-size: var(--text-size-s);
    color: var(--text-secondary);
    user-select: none;
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
    width: 80%;
    height: 80%;
    text-align: center;
    display: inline-block;
    font-size: 16px;
    font-weight: 300;
    line-height: 1;
    transform-origin: center;
}

@keyframes fadeInAndMoveUp {
    0% {
        transform: translateY(16px);
        opacity: 0.5;
    }
    100% {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes fadeOutAndMoveDown {
    0% {
        transform: translateY(0);
        opacity: 1;
    }
    100% {
        transform: translateY(16px);
        opacity: 0.5;
    }
}
</style>
