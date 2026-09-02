// src/stores/fileStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { traqApi } from '../lib/api/traq'
import type { traQcomponents } from '../types/traq'

type FileInfo = traQcomponents['schemas']['FileInfo']

export const useFileStore = defineStore('file', () => {
    // --- メタ情報キャッシュ ---
    const files = ref<Map<string, FileInfo>>(new Map())
    const metaFetchPromises = new Map<string, Promise<void>>()

    const fetchFileMeta = (fileId: string): Promise<void> => {
        if (files.value.has(fileId)) return Promise.resolve()
        const inFlight = metaFetchPromises.get(fileId)
        if (inFlight) return inFlight

        const promise = traqApi
            .getFileMeta(fileId)
            .then((meta) => {
                files.value.set(fileId, meta)
            })
            .catch((error) => {
                console.error(`ファイルメタ情報の取得に失敗: ${fileId}`, error)
            })
            .finally(() => {
                metaFetchPromises.delete(fileId)
            })

        metaFetchPromises.set(fileId, promise)
        return promise
    }

    const getFileMeta = (fileId: string): FileInfo | undefined => files.value.get(fileId)

    // --- 実体データ (Blob URL) キャッシュ: image/video/audio のみ ---
    const contentUrls = ref<Map<string, string>>(new Map())
    const contentFetchPromises = new Map<string, Promise<void>>()
    // タイムラインを延々スクロールしても blob が溜まり続けないよう、古い順に revoke する上限。
    // 仮想スクローラの同時描画数より十分大きくとる
    const MAX_CACHED_CONTENT = 60

    /**
     * 表示中のファイルの参照カウント。
     * 上限超過の revoke で「いま画面に出ている blob」を消してしまうと、
     * img/video の src が切れたうえ再取得 → また別の表示中を revoke、というループになるため、
     * 参照が残っている ID は追い出し対象から除外する。
     * リアクティブである必要はない（描画には使わず、追い出し判定にしか使わない）
     */
    const contentRefCounts = new Map<string, number>()

    const retainFileContent = (fileId: string): void => {
        contentRefCounts.set(fileId, (contentRefCounts.get(fileId) ?? 0) + 1)
    }

    const releaseFileContent = (fileId: string): void => {
        const next = (contentRefCounts.get(fileId) ?? 0) - 1
        if (next > 0) contentRefCounts.set(fileId, next)
        else contentRefCounts.delete(fileId)
    }

    /** 上限超過分を挿入順（＝古い順）に revoke する。表示中（参照あり）のものは飛ばす */
    const evictUnreferencedContent = (): void => {
        if (contentUrls.value.size <= MAX_CACHED_CONTENT) return
        // Map のイテレート中に現在のキーを delete するのは仕様上安全（次の要素へ進める）
        for (const key of contentUrls.value.keys()) {
            if (contentUrls.value.size <= MAX_CACHED_CONTENT) break
            if (contentRefCounts.has(key)) continue
            const oldUrl = contentUrls.value.get(key)
            if (oldUrl) URL.revokeObjectURL(oldUrl)
            contentUrls.value.delete(key)
        }
    }

    const fetchFileContent = (fileId: string): Promise<void> => {
        if (contentUrls.value.has(fileId)) return Promise.resolve()
        const inFlight = contentFetchPromises.get(fileId)
        if (inFlight) return inFlight

        const promise = traqApi
            .getFileContent(fileId)
            .then((blob) => {
                contentUrls.value.set(fileId, URL.createObjectURL(blob))
                // 書き込み時のみ触る（getFileContentUrl は computed から呼ばれるため変更しない）
                evictUnreferencedContent()
            })
            .catch((error) => {
                console.error(`ファイル実体の取得に失敗: ${fileId}`, error)
            })
            .finally(() => {
                contentFetchPromises.delete(fileId)
            })

        contentFetchPromises.set(fileId, promise)
        return promise
    }

    const getFileContentUrl = (fileId: string): string | undefined => contentUrls.value.get(fileId)

    return {
        files,
        fetchFileMeta,
        getFileMeta,
        contentUrls,
        fetchFileContent,
        getFileContentUrl,
        retainFileContent,
        releaseFileContent,
    }
})
