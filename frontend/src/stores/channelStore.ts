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
            .then((response) => {
                // public チャンネルからチャンネル情報を収集（DMは現状使わない）
                const channelMap = new Map(response.public.map((channel) => [channel.id, channel]))
                channels.value = channelMap

                // フルパス（例: gps/times/foo）は parentId を辿ってローカルで組み立てる。
                // 以前はチャンネルごとに GET /channels/{id}/path を叩いており、
                // 公開チャンネルが数千あると ERR_INSUFFICIENT_RESOURCES / 429 を招いていた。
                const paths = new Map<string, string>()
                const buildPath = (id: string, seen: Set<string>): string => {
                    const cached = paths.get(id)
                    if (cached !== undefined) return cached
                    if (seen.has(id)) return '' // 循環（通常は起きない）に対する保険
                    seen.add(id)

                    const channel = channelMap.get(id)
                    if (!channel) return ''

                    const parentPath = channel.parentId ? buildPath(channel.parentId, seen) : ''
                    const full = parentPath ? `${parentPath}/${channel.name}` : channel.name
                    paths.set(id, full)
                    return full
                }
                for (const id of channelMap.keys()) {
                    buildPath(id, new Set())
                }
                channelPaths.value = paths
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getChannelName = (channelId: string): string => {
        return (
            channelPaths.value.get(channelId) ||
            channels.value.get(channelId)?.name ||
            channelId.slice(0, 8)
        )
    }

    const getChannel = (channelId: string): Channel | undefined => {
        return channels.value.get(channelId)
    }

    const getChannelIdByName = (name: string): string | null => {
        for (const [id, channel] of channels.value) {
            if (channel.name === name) return id
        }
        return null
    }

    return {
        channels,
        channelPaths,
        isLoading,
        fetchChannels,
        getChannelName,
        getChannel,
        getChannelIdByName,
    }
})
