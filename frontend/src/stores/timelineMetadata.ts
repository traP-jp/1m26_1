import type { Pinia } from 'pinia'
import { useChannelStore } from './channelStore'
import { useStampStore } from './stampStore'
import { useUserStore } from './userStore'

/**
 * タイムラインで参照するマスターデータをまとめて読み込む。
 *
 * 各ストア側でもリクエストを共有しているため、この関数を複数回呼んでも
 * 同じデータに対する通信は 1 回だけになる。
 */
export const initializeTimelineMetadata = async (pinia?: Pinia) => {
  const userStore = useUserStore(pinia)
  const channelStore = useChannelStore(pinia)
  const stampStore = useStampStore(pinia)

  await Promise.all([userStore.fetchUsers(), channelStore.fetchChannels(), stampStore.fetchStamps()])
}
