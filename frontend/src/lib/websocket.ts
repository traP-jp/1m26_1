export function createWebSocket(path: string): WebSocket {
    const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
    const url = new URL(path, baseUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return new WebSocket(url)
}
