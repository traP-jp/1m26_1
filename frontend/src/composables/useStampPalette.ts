import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { traqApi } from '../lib/api/traq'
import { addStamp } from '../lib/stamps'
import type { ApiTimelineMessage } from '../lib/api/endpoints'
import type { traQcomponents } from '../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']
type Message = Pick<ApiTimelineMessage, 'id' | 'stamps'>

interface UseStampPaletteOptions {
    findMessage: (messageId: string) => Message | undefined
    updateMessageStamps: (messageId: string, stamps: ApiTimelineMessage['stamps']) => void
    onAdd?: (messageId: string, stampId: string, stamps: ApiTimelineMessage['stamps']) => void
}

export function useStampPalette({
    findMessage,
    updateMessageStamps,
    onAdd,
}: UseStampPaletteOptions) {
    const authStore = useAuthStore()
    const isPaletteOpen = ref(false)
    const targetMessageId = ref<string | null>(null)
    const palettePosition = ref({ x: 0, y: 0 })

    const openPalette = (messageId: string, position: { x: number; y: number }) => {
        targetMessageId.value = messageId
        palettePosition.value = position
        isPaletteOpen.value = true
    }

    const closePalette = () => {
        isPaletteOpen.value = false
        targetMessageId.value = null
    }

    const selectStamp = async (stamp: Stamp) => {
        const messageId = targetMessageId.value
        const userId = authStore.userId
        if (!messageId || !userId) return

        const targetMessage = findMessage(messageId)
        if (!targetMessage) {
            console.warn('対象メッセージが見つかりません')
            return
        }

        const before = targetMessage.stamps
        onAdd?.(messageId, stamp.id, before)
        updateMessageStamps(messageId, addStamp(before, stamp.id, userId))

        try {
            await traqApi.pinStamp(messageId, stamp.id)
        } catch (error) {
            console.error('スタンプ追加に失敗:', error)
            updateMessageStamps(messageId, before)
        }
    }

    return {
        isPaletteOpen,
        palettePosition,
        openPalette,
        closePalette,
        selectStamp,
    }
}
