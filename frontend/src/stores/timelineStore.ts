import { defineStore } from 'pinia'

import type { TimelineMessage } from '../types/message'

export const useTimelineStore = defineStore('timeline', {
    state: () => ({
        messages: [
            {
                id: 'welcome',
                userName: 'traP',
                content: 'ドパガキ用traQへようこそ！',
                createdAt: new Date().toISOString(),
                attachments: [],
                stamps: ['🎉'],
            },
        ] as TimelineMessage[],
    }),
})
