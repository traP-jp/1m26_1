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
    <!-- 仮想スクローラは各アイテムに transform を掛ける。transform は position: fixed の
         包含ブロックとスタッキングコンテキストの両方を作るため、この中に置いたままだと
         (1) clientX/clientY 基準の座標がアイテム原点からの相対になってずれ、
         (2) z-index: 9999 がアイテム内に閉じ込められ後続のメッセージが上に描かれる。
         body へ teleport して両方を回避する -->
    <Teleport to="body">
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
                    <img
                        v-if="getStampImageUrl(stampId)"
                        :src="getStampImageUrl(stampId)"
                        alt="stamp"
                        class="tooltip-stamp-image"
                        referrerpolicy="no-referrer"
                        loading="lazy"
                        @error="
                            (e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                            }
                        "
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
                        @error="
                            (e) => {
                                ;(e.target as HTMLImageElement).style.display = 'none'
                            }
                        "
                    />
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
/* ===== ツールチップ（ライトモードベース） ===== */
.stamp-tooltip {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    background: #ffffff;
    color: #1d1d1f;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow:
        0 8px 28px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    max-width: 200px;
    min-width: 120px;
    transform: translate(0, 0);
    font-size: 13px;
    line-height: 1.4;
}

.tooltip-stamp {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 4px;
}

.tooltip-emoji {
    font-size: 36px;
    line-height: 1;
}

.tooltip-stamp-image {
    width: 44px;
    height: 44px;
    object-fit: contain;
    border-radius: 6px;
}

.tooltip-stamp-name {
    font-size: 14px;
    color: #8e8e93;
    font-weight: 500;
}

.tooltip-name {
    text-align: center;
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 8px;
    color: #1d1d1f;
    letter-spacing: -0.2px;
}

.tooltip-users {
    display: flex;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
}

.tooltip-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1.5px solid #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    object-fit: cover;
    background: #f2f2f7;
    flex-shrink: 0;
}
</style>
