// src/stores/channelStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type Channel = traQcomponents['schemas']['PublicChannel']

export const useChannelStore = defineStore('channel', () => {
    // id -> Channel のマップ
    const channels = ref<Map<string, Channel>>(new Map())
    const channelPaths = ref<Map<string, string>>(new Map())
    const isLoading = ref(false)
    let fetchPromise: Promise<void> | undefined

    const fetchChannels = async () => {
        if (channels.value.size > 0) return
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        fetchPromise = traqApi
            .getChannels()
            .then(async (response) => {
                // public チャンネルからチャンネル情報を収集（DMは現状使わない）
                channels.value = new Map(response.public.map((channel) => [channel.id, channel]))
                await Promise.all(
                    response.public.map(async (channel) => {
                        const { path } = await traqApi.getChannelPath(channel.id)
                        channelPaths.value.set(channel.id, path)
                    }),
                )
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getChannelName = (channelId: string): string => {
        console.log(channelPaths.value.get(channelId))
        return (
            channelPaths.value.get(channelId) ||
            channels.value.get(channelId)?.name ||
            channelId.slice(0, 8)
        )
    }

    const getChannel = (channelId: string): Channel | undefined => {
        return channels.value.get(channelId)
    }

    return {
        channels,
        channelPaths,
        isLoading,
        fetchChannels,
        getChannelName,
        getChannel,
    }
})
