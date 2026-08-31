import axios from 'axios'
import { useAuthStore } from '../../stores/authStore'

export const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
})

// リクエストインターセプタ：常に最新のトークンを付与
apiClient.interceptors.request.use((config) => {
    const authStore = useAuthStore()
    if (authStore.accessToken) {
        config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
    return config
})

// レスポンスインターセプタ：401 エラー時にログアウト処理（任意）
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const authStore = useAuthStore()
            authStore.logout()
            // ログインページへリダイレクトなど
            window.location.href = '/'
        }
        return Promise.reject(error)
    },
)