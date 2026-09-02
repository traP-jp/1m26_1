<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import { useFileStore } from '../../stores/fileStore'
import type { traQcomponents } from '../../types/traq'

type FileInfo = traQcomponents['schemas']['FileInfo']

const props = defineProps<{ fileIds: string[] }>()
const fileStore = useFileStore()

watchEffect(() => {
    for (const id of props.fileIds) {
        fileStore.fetchFileMeta(id)
    }
})

/** `image/svg+xml; charset=utf-8` のようなパラメータ付きも来うるので型/サブタイプだけ見る */
const baseMime = (mime: string) => mime.split(';')[0]!.trim().toLowerCase()

// SVG はプレビューせずダウンロード専用（other）に落とす。
// blob URL は生成元のオリジンを継承するため、blob を新規タブで開かせると
// SVG 内のスクリプトが自オリジンで実行されてしまう（stored XSS）
const isImage = (mime: string) => {
    const type = baseMime(mime)
    return type.startsWith('image/') && type !== 'image/svg+xml'
}
const isVideo = (mime: string) => baseMime(mime).startsWith('video/')
const isAudio = (mime: string) => baseMime(mime).startsWith('audio/')

const files = computed(() =>
    props.fileIds
        .map((id) => fileStore.getFileMeta(id))
        .filter((f): f is NonNullable<typeof f> => f !== undefined),
)

type DisplayKind = 'image' | 'video' | 'audio' | 'other'

const displayKind = (mime: string): DisplayKind =>
    isImage(mime) ? 'image' : isVideo(mime) ? 'video' : isAudio(mime) ? 'audio' : 'other'

/** プレビューのために実体データを先読みするファイル（other はクリック時まで取りにいかない） */
const previewFileIds = computed(() =>
    files.value.filter((file) => displayKind(file.mime) !== 'other').map((file) => file.id),
)

// 先読み中〜表示中は fileStore に参照を主張し、キャッシュ上限超過の revoke で
// 画面に出ている blob が消されないようにする（onCleanup は差し替え時と unmount 時に走る）
watch(
    previewFileIds,
    (ids, _prev, onCleanup) => {
        for (const id of ids) {
            fileStore.retainFileContent(id)
            fileStore.fetchFileContent(id)
        }
        onCleanup(() => {
            for (const id of ids) fileStore.releaseFileContent(id)
        })
    },
    { immediate: true },
)

// メタ情報が届いていても、image/video/audio はプレビュー実体データが揃うまで表示しない
const displayItems = computed(() =>
    files.value
        .map((file) => {
            const kind = displayKind(file.mime)
            const contentUrl = kind === 'other' ? undefined : fileStore.getFileContentUrl(file.id)
            const ready = kind === 'other' || contentUrl !== undefined
            return { file, kind, contentUrl, ready }
        })
        .filter((item) => item.ready),
)

// image/video/audio は取得済みの blob URL をそのまま参照させる（q.trap.jp/files/{id} は SPA に
// フォールバックして 404 になるため使わない）。実体を先読みしない other はクリック時に取得する。
// a.download を使うのでナビゲートは起きず、SVG や HTML でもスクリプトは実行されない
const downloadOther = async (file: FileInfo) => {
    await fileStore.fetchFileContent(file.id)
    const url = fileStore.getFileContentUrl(file.id)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
}
</script>

<template>
    <ul v-if="displayItems.length" class="attachment-list">
        <li v-for="item in displayItems" :key="item.file.id" class="attachment-item">
            <a
                v-if="item.kind === 'image'"
                :href="item.contentUrl"
                target="_blank"
                rel="noreferrer"
            >
                <img
                    :src="item.contentUrl"
                    :alt="item.file.name"
                    class="attachment-image"
                    loading="lazy"
                />
            </a>
            <!-- video/audio はプレイヤーをリンクで包まない（コントロールのクリックが
                 アンカーまでバブルして、再生しようとすると新規タブが開いてしまうため）。
                 保存はヘッダー行のダウンロードリンクから行う -->
            <div
                v-else-if="item.kind === 'video' || item.kind === 'audio'"
                class="attachment-media"
            >
                <div class="attachment-media-header">
                    <span class="attachment-icon attachment-icon--media">
                        <svg
                            v-if="item.kind === 'audio'"
                            viewBox="0 0 24 24"
                            fill="#626273"
                            aria-hidden="true"
                        >
                            <path
                                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                            />
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="#626273" aria-hidden="true">
                            <path
                                d="M4 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm15 4.5 3-2v9l-3-2v-5Z"
                            />
                        </svg>
                    </span>
                    <span class="attachment-name">{{ item.file.name }}</span>
                    <a
                        :href="item.contentUrl"
                        :download="item.file.name"
                        class="attachment-download"
                        :aria-label="`${item.file.name} をダウンロード`"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </a>
                </div>
                <video
                    v-if="item.kind === 'video'"
                    :src="item.contentUrl"
                    class="attachment-video"
                    controls
                />
                <audio v-else :src="item.contentUrl" class="attachment-audio-player" controls />
            </div>
            <button v-else type="button" class="attachment-file" @click="downloadOther(item.file)">
                <span class="attachment-icon">
                    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" aria-hidden="true">
                        <path
                            d="M12 24.75C13.475 24.75 14.7188 24.2375 15.7313 23.2125C16.7438 22.1875 17.25 20.95 17.25 19.5V15C17.25 14.8 17.175 14.625 17.025 14.475C16.875 14.325 16.7 14.25 16.5 14.25C16.3 14.25 16.125 14.325 15.975 14.475C15.825 14.625 15.75 14.8 15.75 15V19.5C15.75 20.55 15.3875 21.4375 14.6625 22.1625C13.9375 22.8875 13.05 23.25 12 23.25C10.95 23.25 10.0625 22.8875 9.3375 22.1625C8.6125 21.4375 8.25 20.55 8.25 19.5V11.25C8.25 10.8 8.39375 10.4375 8.68125 10.1625C8.96875 9.8875 9.325 9.75 9.75 9.75C10.2 9.75 10.5625 9.8875 10.8375 10.1625C11.1125 10.4375 11.25 10.8 11.25 11.25V18C11.25 18.2 11.325 18.375 11.475 18.525C11.625 18.675 11.8 18.75 12 18.75C12.2 18.75 12.375 18.675 12.525 18.525C12.675 18.375 12.75 18.2 12.75 18V11.25C12.75 10.4 12.4625 9.6875 11.8875 9.1125C11.3125 8.5375 10.6 8.25 9.75 8.25C8.925 8.25 8.21875 8.5375 7.63125 9.1125C7.04375 9.6875 6.75 10.4 6.75 11.25V19.5C6.75 20.95 7.2625 22.1875 8.2875 23.2125C9.3125 24.2375 10.55 24.75 12 24.75ZM2.25 30C1.65 30 1.125 29.775 0.675 29.325C0.225 28.875 0 28.35 0 27.75V2.25C0 1.65 0.225 1.125 0.675 0.675C1.125 0.225 1.65 0 2.25 0H15.7875L24 8.2125V27.75C24 28.35 23.775 28.875 23.325 29.325C22.875 29.775 22.35 30 21.75 30H2.25ZM14.775 2.25V8.1C14.775 8.425 14.8813 8.69375 15.0938 8.90625C15.3063 9.11875 15.575 9.225 15.9 9.225H21.75L14.775 2.25Z"
                            fill="#626273"
                        />
                    </svg>
                </span>
                <span class="attachment-name">{{ item.file.name }}</span>
                <span class="attachment-download">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </span>
            </button>
        </li>
    </ul>
</template>
