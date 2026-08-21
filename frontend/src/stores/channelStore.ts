// src/stores/channelStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type Channel = traQcomponents['schemas']['PublicChannel']
export const useChannelStore = defineStore('channel', () => {
    // id -> Channel のマップ
    const channels = ref<Map<string, Channel>>(new Map())
    const isLoading = ref(false)
    let fetchPromise: Promise<void> | undefined

    const fetchChannels = async () => {
        if (channels.value.size > 0) return
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        fetchPromise = traqApi
            .getChannels()
            .then((response) => {
            // public チャンネルからチャンネル情報を収集（DMは現状使わない）
                channels.value = new Map(response.public.map((channel) => [channel.id, channel]))
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getChannelName = (channelId: string): string => {
        return channels.value.get(channelId)?.name || channelId.slice(0, 8)
    }

    const getChannel = (channelId: string): Channel | undefined => {
        return channels.value.get(channelId)
    }

    return {
        channels,
        isLoading,
        fetchChannels,
        getChannelName,
        getChannel,
    }
})
