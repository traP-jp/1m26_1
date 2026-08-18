export const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export async function getApi<T>(path: string): Promise<T> {
    const response = await fetch(new URL(path, apiBaseUrl))
    if (!response.ok) throw new Error(`API request failed: ${response.status}`)
    return response.json() as Promise<T>
}
