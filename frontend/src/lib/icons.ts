// src/lib/icons.ts
//
// traQ のアイコン画像は image-proxy 経由の直リンクで取得する（API 経由ではない）。
// URL 組み立てをここに集約し、呼び出し側でサイズを指定できるようにする。

/**
 * traQ ユーザーのアイコン画像 URL を組み立てる。
 * @param name - traQ ID（表示名ではない）
 * @param size - 一辺のピクセル数（デフォルト: 64）
 */
export function traqIconUrl(name: string, size = 64): string {
    return `https://image-proxy.trap.jp/icon/${encodeURIComponent(name)}?width=${size}&height=${size}`
}
