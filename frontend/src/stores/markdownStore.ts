import type { Store } from '@traptitech/traq-markdown-it'
import { useStampStore } from './stampStore'
import { useUserStore } from './userStore'
import { useChannelStore } from './channelStore'

export const markdownStore: Store = {
    getUser(id) {
        return useUserStore().getUser(id)
    },

    getChannel(id) {
        return useChannelStore().getChannel(id)
    },

    getUserGroup() {
        return undefined
    },

    getMe() {
        return undefined
    },

    getStampByName(name) {
        const stampStore = useStampStore()
        const stampId = stampStore.getStampIdByName?.(name)
        if (!stampId) return undefined
        const stamp = stampStore.getStamp(stampId)
        if (!stamp) return undefined
        return {
            name: stamp.name,
            fileId: stamp.id,
        }
    },

    getUserByName(name) {
        for (const user of useUserStore().users.values()) {
            if (user.name === name) {
                return { iconFileId: user.iconFileId }
            }
        }
        return undefined
    },

    generateUserHref(id) {
        return `/users/${encodeURIComponent(id)}`
    },

    generateUserGroupHref(id) {
        return `/user-groups/${encodeURIComponent(id)}`
    },

    generateChannelHref(id) {
        return `/channels/${encodeURIComponent(id)}`
    },

    generateStampHref(fileId) {
        return `https://image-proxy.trap.jp/stamp/${encodeURIComponent(fileId)}?width=48&height=48&format=webp`
    },
}
