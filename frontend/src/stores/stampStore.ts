import { defineStore } from 'pinia'

export const useStampStore = defineStore('stamp', {
    state: () => ({ recent: [] as string[] }),
})
