// src/lib/websocket.ts
import { useAuthStore } from '../stores/authStore'
import type { components } from '../gen/api-types'

// 生成された型を直接参照
type WSEventMap = {
    MessageCreated: components['schemas']['MessageCreatedBody']
    MessageDeleted: components['schemas']['MessageDeletedBody']
    MessageEdited: components['schemas']['MessageEditedBody']
    StampUpdated: components['schemas']['StampUpdatedBody']
    UsernameChanged: components['schemas']['UsernameChangedBody']
    UserIconReplaced: components['schemas']['UserIconReplacedBody']
    StampInfoChanged: components['schemas']['StampInfoChangedBody']
    StampImageReplaced: components['schemas']['StampImageReplacedBody']
}

type WSEventType = keyof WSEventMap
type WSEvent<T extends WSEventType = WSEventType> = {
    type: T
    body: WSEventMap[T]
}

export class WebSocketManager {
    private ws: WebSocket | null = null
    private reconnectTimer: number | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 10
    private isClosedManually = false
    private eventHandlers: Map<WSEventType, ((body: unknown) => void)[]> = new Map()

    connect() {
        const authStore = useAuthStore()
        const token = authStore.accessToken
        if (!token) {
            console.warn('WebSocket: トークンがありません')
            return
        }
        this.isClosedManually = false

        const base = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
        const url = new URL(base)
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        url.pathname = '/api/ws'
        url.searchParams.set('token', token)
        const wsUrl = url.toString()

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
            console.log('WebSocket: 接続確立')
            this.reconnectAttempts = 0
        }

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as WSEvent
                const handlers = this.eventHandlers.get(data.type) || []
                handlers.forEach((handler) => handler(data.body))
            } catch (e) {
                console.error('WebSocket: メッセージパースエラー', e)
            }
        }

        this.ws.onclose = () => {
            console.log('WebSocket: 切断')
            if (!this.isClosedManually) {
                this.scheduleReconnect()
            }
        }

        this.ws.onerror = (error) => {
            console.error('WebSocket: エラー', error)
        }
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('WebSocket: リトライ上限に達しました')
            return
        }
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000)
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
        }, delay)
    }

    disconnect() {
        this.isClosedManually = true
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }

    on<T extends WSEventType>(type: T, handler: (body: WSEventMap[T]) => void) {
        if (!this.eventHandlers.has(type)) {
            this.eventHandlers.set(type, [])
        }
        this.eventHandlers.get(type)!.push(handler as (body: unknown) => void)
    }

    off<T extends WSEventType>(type: T, handler: (body: WSEventMap[T]) => void) {
        const handlers = this.eventHandlers.get(type)
        if (handlers) {
            this.eventHandlers.set(
                type,
                handlers.filter((h) => h !== handler),
            )
        }
    }
}

export const wsManager = new WebSocketManager()
