import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNewMessageStore = defineStore('newMessage', () => {
    const count = ref(0)
    const isVisible = ref(false)

    const setCount = (value: number) => {
        count.value = value
    }

    const show = () => {
        isVisible.value = true
    }

    const hide = () => {
        isVisible.value = false
    }

    return { count, isVisible, setCount, show, hide }
})
