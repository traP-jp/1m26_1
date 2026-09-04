<script setup lang="ts">
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStampStore } from '../../stores/stampStore'
import { useMessageList } from '../../lib/messageListContext'
import { traqApi } from '../../lib/api/traq'
import { addStamp, groupStamps, hasMyStamp, removeStamp, type StampGroup } from '../../lib/stamps'
import StampTooltip from './StampTooltip.vue'
import type { components } from '../../gen/api-types'

type Stamp = components['schemas']['Stamp']

const props = defineProps<{
    messageId: string
    stamps: Stamp[]
}>()

const authStore = useAuthStore()
const stampStore = useStampStore()
// スタンプの楽観的更新の書き戻し先とパレットの開閉は、タイムラインと詳細ビューで
// 相手が違う。ストアを直接掴まず、一覧側が provide する context 経由で呼ぶ。
const messageList = useMessageList()

// ============================================
// 0. アニメーション関連の状態管理
// ============================================
/** 前フレームの groupedStamps を保持 */
const previousGroupedStamps = ref<StampGroup[]>([])
/** アニメーション中のスタンプとそのタイプを管理 */
const animatingStamps = ref<Map<string, 'add' | 'remove' | 'count-up' | 'count-down'>>(new Map())
const animationTimers = new Set<ReturnType<typeof setTimeout>>()

const scheduleAnimationCleanup = (stampId: string) => {
    const timer = setTimeout(() => {
        animationTimers.delete(timer)
        animatingStamps.value.delete(stampId)
        previousGroupedStamps.value = groupedStamps.value
    }, 200)
    animationTimers.add(timer)
}

onUnmounted(() => {
    for (const timer of animationTimers) clearTimeout(timer)
    animationTimers.clear()
})

// ============================================
// 1. スタンプをグループ化（表示用）
// ============================================
// props.stamps はバックエンドが返す (ユーザー, スタンプ) 単位の全件そのもの
// （traQ への追加フェッチは不要）。表示用にスタンプごとへまとめるだけ。
const groupedStamps = computed(() => groupStamps(props.stamps, authStore.userId))

// ============================================
// 1.5. groupedStamps の変化を監視してアニメーションを制御
// ============================================

watchEffect(() => {
    const current = groupedStamps.value
    const previous = previousGroupedStamps.value

    // 新しいアニメーションをリセット
    const newAnimatingStamps = new Map<string, 'add' | 'remove' | 'count-up' | 'count-down'>()
    // 前フレームに存在したスタンプのstampId:stampのマップを作成（比較用）
    const previousMap = new Map(previous.map((g) => [g.stampId, g]))
    const currentMap = new Map(current.map((g) => [g.stampId, g]))

    // 現在のスタンプを走査
    for (const currentGroup of current) {
        const prevGroup = previousMap.get(currentGroup.stampId)

        if (!prevGroup) {
            // 新しいスタンプが追加された
            newAnimatingStamps.set(currentGroup.stampId, 'add')
            // 200ms 後にアニメーション状態を削除
            scheduleAnimationCleanup(currentGroup.stampId)
        } else if (currentGroup.totalCount > prevGroup.totalCount) {
            // スタンプの数が増えた
            newAnimatingStamps.set(currentGroup.stampId, 'count-up')
            scheduleAnimationCleanup(currentGroup.stampId)
        } else if (currentGroup.totalCount < prevGroup.totalCount) {
            // スタンプの数が減った
            newAnimatingStamps.set(currentGroup.stampId, 'count-down')
            scheduleAnimationCleanup(currentGroup.stampId)
        }
    }

    // 前フレームに存在して、現在には存在しないスタンプを走査
    for (const prevGroup of previous) {
        if (!currentMap.has(prevGroup.stampId)) {
            // スタンプが削除された
            newAnimatingStamps.set(prevGroup.stampId, 'remove')
            // 200ms 後にアニメーション状態と一時保持を削除
            scheduleAnimationCleanup(prevGroup.stampId)
        }
    }
    animatingStamps.value = newAnimatingStamps
})

// ============================================
// 2. ホバー状態管理（stampId のみ保持）
// ============================================
const hoveredStampId = ref<string | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches

const hoveredGroup = computed(() => {
    if (!hoveredStampId.value) return null
    return groupedStamps.value.find((g) => g.stampId === hoveredStampId.value) ?? null
})

const onMouseEnter = (group: StampGroup, event: MouseEvent) => {
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
// 2.5. 表示用スタンプリスト（previousGroupedStamps + 新規追加中のスタンプ）
// ============================================
const displayGroupedStamps = computed(() => {
    const result = [...previousGroupedStamps.value]

    // animatingStamps が 'add' のスタンプを groupedStamps から追加
    for (const group of groupedStamps.value) {
        if (animatingStamps.value.get(group.stampId) === 'add') {
            // 既に存在するかチェック
            if (!result.find((g) => g.stampId === group.stampId)) {
                result.push(group)
            }
        }
    }

    return result
})

// ============================================
// 3. スタンプ操作（押す / 解除）
// ============================================
const toggleStamp = async (stampId: string) => {
    const userId = authStore.userId
    if (!userId) return

    // props.stamps はストア由来なので、楽観的更新の前に元の配列を控えておく
    // （更新後に読み直すと巻き戻せない）
    const before = props.stamps
    const pinned = hasMyStamp(before, stampId, userId)

    // 楽観的更新。消えるアニメーションは groupedStamps の差分から出るので、ここでは待たない
    messageList.updateMessageStamps(
        props.messageId,
        pinned ? removeStamp(before, stampId, userId) : addStamp(before, stampId, userId),
    )

    try {
        if (pinned) {
            await traqApi.unpinStamp(props.messageId, stampId)
        } else {
            await traqApi.pinStamp(props.messageId, stampId)
        }
    } catch (error) {
        console.error('スタンプ操作に失敗:', error)
        messageList.updateMessageStamps(props.messageId, before)
    }
}

// ============================================
// 4. スタンプメタ情報取得（stampStore 経由）
// ============================================
const getStamp = (stampId: string) => stampStore.getStamp(stampId)
const getStampDisplayName = (stampId: string) => stampStore.getStampDisplayName(stampId)
const getStampImageUrl = (stampId: string) => stampStore.getStampImageUrl(stampId)

const openPalette = (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    messageList.openPalette(props.messageId, {
        x: rect.left,
        y: rect.bottom, // ボタンの下端を基準にする
    })
}
</script>

<template>
    <div class="stamp-list">
        <!-- 通常のスタンプ表示 -->
        <span
            v-for="group in displayGroupedStamps"
            :key="group.stampId"
            class="stamp-item"
            :class="{
                pinned: group.isPinned,
                'animate-add': animatingStamps.get(group.stampId) === 'add',
                'animate-count-up': animatingStamps.get(group.stampId) === 'count-up',
                'animate-count-down': animatingStamps.get(group.stampId) === 'count-down',
                'animate-remove': animatingStamps.get(group.stampId) === 'remove',
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

/* ============================================
   アニメーション定義
   ============================================ */
@keyframes slideInFromBottom {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideOutToBottom {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(10px);
    }
}

@keyframes drumRollUp {
    from {
        transform: translateY(0px);
        opacity: 0.5;
    }
    to {
        transform: translateY(-20px);
        opacity: 1;
    }
}

@keyframes drumRollDown {
    from {
        transform: translateY(0px);
        opacity: 0.5;
    }
    to {
        transform: translateY(20px);
        opacity: 1;
    }
}

@keyframes zoomIn {
    from {
        transform: scale(0.8);
    }
    to {
        transform: scale(1);
    }
}

/* ============================================
   スタンプアイテムのスタイルとアニメーション
   ============================================ */
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
    overflow-y: hidden;
}

.stamp-item.animate-add {
    animation: slideInFromBottom 0.2s ease-out forwards;
}
.stamp-item.animate-add > .stamp-image {
    animation: zoomIn 0.2s ease-out forwards;
}

.stamp-item.animate-remove {
    animation: slideOutToBottom 0.2s ease-out forwards;
}

.stamp-item.animate-count-up .stamp-count {
    animation: drumRollUp 0.2s ease-out forwards;
}
.stamp-item.animate-count-up > .stamp-image {
    animation: zoomIn 0.2s ease-out forwards;
}

.stamp-item.animate-count-down .stamp-count {
    animation: drumRollDown 0.2s ease-out forwards;
}

.stamp-item:hover {
    background: var(--surface-hover, #e5e5ea);
}

.stamp-item.pinned {
    background: #fbe0bb;
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
</style>
