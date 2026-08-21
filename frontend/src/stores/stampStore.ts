// src/stores/stampStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type Stamp = traQcomponents['schemas']['Stamp']

export const useStampStore = defineStore('stamp', () => {
    const stamps = ref<Map<string, Stamp>>(new Map())
    const isLoading = ref(false)
    let fetchPromise: Promise<void> | undefined

    const fetchStamps = async () => {
        if (stamps.value.size > 0) return
        if (fetchPromise) return fetchPromise

        isLoading.value = true
        fetchPromise = traqApi
            .getStamps()
            .then((stampList) => {
                stamps.value = new Map(stampList.map((stamp) => [stamp.id, stamp]))
            })
            .finally(() => {
                isLoading.value = false
                fetchPromise = undefined
            })

        return fetchPromise
    }

    const getStamp = (stampId: string): Stamp | undefined => {
        return stamps.value.get(stampId)
    }

    const getStampDisplayName = (stampId: string): string => {
        const stamp = stamps.value.get(stampId)
        if (!stamp) return '?'
        if (stamp.isUnicode) {
            return stamp.name
        }
        return `:${stamp.name}:`
    }

    const getStampImageUrl = (stampId: string): string => {
        const stamp = stamps.value.get(stampId)
        if (!stamp || stamp.isUnicode) return ''
        return `https://image-proxy.trap.jp/stamp/${stampId}?width=48&height=48`
    }

    return {
        stamps,
        isLoading,
        fetchStamps,
        getStamp,
        getStampDisplayName,
        getStampImageUrl,
    }
})
