<script setup lang="ts">
import { computed } from 'vue'
import { useStampStore } from '../../stores/stampStore'
import { useUserStore } from '../../stores/userStore'

type Entry = {
    userId: string
    createdAt: string
}

const props = defineProps<{
    stampId: string
    entries: Entry[]
    position: { x: number; y: number }
}>()

const stampStore = useStampStore()
const userStore = useUserStore()

const getStamp = (stampId: string) => stampStore.getStamp(stampId)
const getStampDisplayName = (stampId: string) => stampStore.getStampDisplayName(stampId)
const getStampImageUrl = (stampId: string) => stampStore.getStampImageUrl(stampId)
const getIconUrl = (userId: string) => userStore.getIconUrl(userId)

// ★ 一意なキーを付与したエントリリスト
const sortedEntries = computed(() => {
    return [...props.entries]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((entry, index) => ({
            ...entry,
            uid: `${entry.userId}_${index}`, // 一意なキー
        }))
})
</script>

<template>
    <div
        class="stamp-tooltip"
        :style="{
            left: position.x + 'px',
            top: position.y + 'px',
        }"
    >
        <div class="tooltip-content">
            <!-- スタンプ画像 -->
            <div class="tooltip-stamp">
                <span v-if="getStamp(stampId)?.isUnicode" class="tooltip-emoji">
                    {{ getStampDisplayName(stampId) }}
                </span>
                <img
                    v-else-if="getStampImageUrl(stampId)"
                    :src="getStampImageUrl(stampId)"
                    alt="stamp"
                    class="tooltip-stamp-image"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
                />
                <span v-else class="tooltip-stamp-name">
                    :{{ getStamp(stampId)?.name || '?' }}:
                </span>
            </div>

            <!-- スタンプ名 -->
            <div class="tooltip-name">
                {{ getStampDisplayName(stampId) }}
            </div>

            <!-- ユーザーアイコン（一意なキーを使用） -->
            <div class="tooltip-users">
                <img
                    v-for="entry in sortedEntries"
                    :key="entry.uid"
                    :src="getIconUrl(entry.userId)"
                    alt="user"
                    class="tooltip-avatar"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 既存のスタイルはそのまま */
.stamp-tooltip {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    background: #1d1d1f;
    color: #e8e8ed;
    border-radius: 12px;
    padding: 12px 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    max-width: 220px;
    min-width: 140px;
    transform: translate(0, 0);
    font-size: 13px;
    line-height: 1.4;
}

.tooltip-stamp {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 6px;
}

.tooltip-emoji {
    font-size: 32px;
    line-height: 1;
}

.tooltip-stamp-image {
    width: 48px;
    height: 48px;
    object-fit: contain;
    border-radius: 6px;
}

.tooltip-stamp-name {
    font-size: 14px;
    color: #aaa;
}

.tooltip-name {
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
    color: #ffffff;
}

.tooltip-users {
    display: flex;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
}

.tooltip-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #2c2c2e;
    object-fit: cover;
    background: #3a3a3c;
    flex-shrink: 0;
}

/* ライトモード対応 */
@media (prefers-color-scheme: light) {
    .stamp-tooltip {
        background: #ffffff;
        color: #1d1d1f;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }
    .tooltip-name {
        color: #1d1d1f;
    }
    .tooltip-stamp-name {
        color: #666;
    }
    .tooltip-avatar {
        border-color: #ffffff;
        background: #e8e8ed;
    }
}
</style>
