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

// レスポンスインターセプタ：401 エラー時はログアウトのみ行う。
//
// 以前はここで window.location.href = '/' により全ページリロードしていたが、
// ルーターガードが未認証を検知して traQ へ再リダイレクトし、そのログイン後の
// リクエストがまた 401 になる（スコープ不足やクライアント設定ミスなど）と、
// ログアウト → リロード → 再ログイン → 401 という無限ループになり、
// traQ 側のレート制限（429）を引き起こしていた。
// リダイレクトは行わず、呼び出し元の catch と画面表示に任せる。
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            useAuthStore().logout()
        }
        return Promise.reject(error)
    },
)
