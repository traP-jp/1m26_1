import { http, HttpResponse, delay } from 'msw'
import type { components } from '@/gen/api-types'

// ============================================
// 1. 型定義（traQ API v3 用・手動定義）
// ============================================

interface UserTag {
    tagId: string
    tag: string
    isLocked: boolean
    createdAt: string
    updatedAt: string
}

/**
 * ユーザーアカウント状態
 * - 0: 停止
 * - 1: 有効
 * - 2: 一時停止
 */
type UserAccountState = 0 | 1 | 2

/**
 * ユーザー詳細情報（traQ API v3 準拠）
 */
interface UserDetail {
    /** ユーザーUUID */
    id: string
    /** ユーザーアカウント状態 0: 停止 1: 有効 2: 一時停止 */
    state: UserAccountState
    /** BOTかどうか */
    bot: boolean
    /** アイコンファイルUUID */
    iconFileId: string
    /** ユーザー表示名 (maxLength: 32) */
    displayName: string
    /** ユーザー名 (pattern: ^([a-zA-Z0-9_-]{1,32}|Webhook#[a-zA-Z0-9_-]{22})$) */
    name: string
    /** Twitter ID (pattern: ^[a-zA-Z0-9_]{0,15}$) */
    twitterId: string
    /** 最終オンライン日時 (nullable) */
    lastOnline: string | null
    /** 更新日時 */
    updatedAt: string
    /** タグリスト */
    tags: UserTag[]
    /** 所属グループのUUIDの配列 */
    groups: string[]
    /** 自己紹介 (maxLength: 1000) */
    bio: string
    /** ホームチャンネル (nullable) */
    homeChannel: string | null
}

interface PublicChannel {
    id: string
    parentId: string | null
    archived: boolean
    force: boolean
    topic: string
    name: string
    children: string[]
}

interface DMChannel {
    id: string
    userId: string
}

interface ChannelsResponse {
    public: PublicChannel[]
    dm: DMChannel[]
}

interface Stamp {
    id: string
    name: string
    creatorId: string
    createdAt: string
    updatedAt: string
    fileId: string
    isUnicode: boolean
    hasThumbnail: boolean
}

interface MessageStamp {
    stampId: string
    count: number
    createdAt: string
    updatedAt: string
    userId: string
}

interface Message {
    id: string
    channelId: string
    userId: string
    content: string
    createdAt: string
    updatedAt: string
    stamps: MessageStamp[]
    pinned: boolean
    embed: { content: string } | null
}

// 1m26_1 API の型（生成型からインポート）
type ApiUser = components['schemas']['User']
type ApiUserProfile = components['schemas']['UserProfile']
type ApiTimelineMessage = components['schemas']['TimelineMessage']
type ApiSortByPopularity = components['schemas']['SortByPopularity']

// API クライアントと同じ接続先を使う。Vite と API サーバーが別 origin でも
// ハンドラーが一致するよう、相対 URL ではなく絶対 URL を登録する。
const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const apiUrl = (path: string): string => new URL(path, API_BASE_URL).toString()

// ============================================
// 2. ユーティリティ関数（型安全版）
// ============================================

const generateUUID = (): string => crypto.randomUUID()

const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min

const randomPick = <T>(arr: T[]): T => {
    if (arr.length === 0) {
        throw new Error('配列が空です')
    }
    return arr[Math.floor(Math.random() * arr.length)] as T
}

const simulateNetworkDelay = async (minMs = 100, maxMs = 600) => {
    await delay(randomInt(minMs, maxMs))
}

const randomDate = (from: Date, to: Date): Date =>
    new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))

// ダミー画像（1x1 PNG）を base64 から Uint8Array に変換
const dummyImageData = (() => {
    const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
})()

// ============================================
// 3. モックデータ生成（型安全）
// ============================================

// ---------- ユーザー（traQ API用） ----------
const generateMockUser = (overrides: Partial<UserDetail> = {}): UserDetail => {
    const now = new Date()
    const id = generateUUID()
    const name = `user_${id.slice(0, 8)}`
    const displayNames = ['太郎', '花子', '次郎', 'さくら', 'ゆうた', 'めい', 'こうた', 'りな']
    const bios = [
        '自己紹介文です。よろしくお願いします！',
        'エンジニアリングが好きです 🚀',
        'Vue.jsとTypeScriptを勉強中',
        'traPで楽しく活動しています！',
        '',
    ]
    return {
        id,
        state: 1, // 有効（固定）
        bot: Math.random() > 0.9,
        iconFileId: generateUUID(),
        displayName: `traP ${displayNames[randomInt(0, displayNames.length - 1)]}`,
        name,
        twitterId: Math.random() > 0.7 ? `@${name}` : '',
        lastOnline: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), now).toISOString(),
        updatedAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), now).toISOString(),
        tags: [],
        groups: [],
        bio: randomPick(bios),
        homeChannel: Math.random() > 0.5 ? generateUUID() : null,
        ...overrides,
    }
}

// モックユーザープール（10件）
const MOCK_USERS: UserDetail[] = (() => {
    const users = Array.from({ length: 10 }, () => generateMockUser())
    if (users.length === 0) {
        users.push(generateMockUser())
    }
    return users
})()

// CURRENT_USER を確実に定義（TypeScript に undefined でないことを認識させる）
const CURRENT_USER: UserDetail = (() => {
    const user = MOCK_USERS[0]
    if (!user) {
        return generateMockUser()
    }
    return user
})()

// ---------- チャンネル ----------
const MOCK_PUBLIC_CHANNELS: PublicChannel[] = [
    {
        id: 'c-001',
        parentId: null,
        archived: false,
        force: false,
        topic: '雑談チャンネルです',
        name: 'general',
        children: ['c-002', 'c-003'],
    },
    {
        id: 'c-002',
        parentId: 'c-001',
        archived: false,
        force: false,
        topic: 'ランダムな話題',
        name: 'random',
        children: [],
    },
    {
        id: 'c-003',
        parentId: 'c-001',
        archived: false,
        force: false,
        topic: '開発系の話',
        name: 'development',
        children: [],
    },
    {
        id: 'c-004',
        parentId: null,
        archived: false,
        force: true,
        topic: '重要なお知らせ',
        name: 'announcement',
        children: [],
    },
    {
        id: 'c-005',
        parentId: null,
        archived: true,
        force: false,
        topic: '過去のアーカイブ',
        name: 'archived',
        children: [],
    },
]

const MOCK_DM_CHANNELS: DMChannel[] = [
    { id: 'dm-001', userId: MOCK_USERS[1]?.id || generateUUID() },
    { id: 'dm-002', userId: MOCK_USERS[2]?.id || generateUUID() },
]

// ---------- スタンプ ----------
const generateMockStamp = (overrides: Partial<Stamp> = {}): Stamp => {
    const names = ['👍', '❤️', '😂', '🔥', '🤔', '🎉', '💯', '✨', '🚀', '👀']
    const isUnicode = Math.random() > 0.3
    const creatorId = MOCK_USERS.length > 0 ? randomPick(MOCK_USERS).id : CURRENT_USER.id
    return {
        id: generateUUID(),
        name: isUnicode ? randomPick(names) : `stamp_${generateUUID().slice(0, 8)}`,
        creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileId: generateUUID(),
        isUnicode,
        hasThumbnail: Math.random() > 0.5,
        ...overrides,
    }
}

const MOCK_STAMPS: Stamp[] = Array.from({ length: 10 }, () => generateMockStamp())

// ---------- メッセージ ----------
const generateMockMessage = (overrides: Partial<Message> = {}): Message => {
    const author = MOCK_USERS.length > 0 ? randomPick(MOCK_USERS) : CURRENT_USER
    const channel = randomPick(MOCK_PUBLIC_CHANNELS)
    const now = new Date()
    const createdAt = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now)

    const stampCount = randomInt(0, 4)
    const stamps: MessageStamp[] = []
    const shuffledStamps = [...MOCK_STAMPS].sort(() => Math.random() - 0.5)
    for (let i = 0; i < stampCount; i++) {
        const s = shuffledStamps[i]
        if (!s) continue
        const firstStampAt = randomDate(createdAt, now)
        stamps.push({
            stampId: s.id,
            count: randomInt(1, 20),
            createdAt: firstStampAt.toISOString(),
            updatedAt: randomDate(firstStampAt, now).toISOString(),
            userId: randomPick(MOCK_USERS).id,
        })
    }

    const messageTexts = [
        '今日の進捗: Reactの勉強してた！やっとhooks理解した気がする。',
        '科学大内で謎の写真を撮った。誰かこの場所わかる？',
        '最近ずっとこの曲聴いてる。めっちゃ良い。',
        'あいまい検索って実際どう実装するんだろうな…？',
        'ルーレットで決まったけど、やっぱtraQ関連で正解だった気がする。',
        '新しくスタンプが増えた？ かわいい。',
        '明日の締切やばい…誰か助けて',
        '今週の目標: 毎日運動する 💪',
        'おすすめの本があったら教えてください 📚',
        '今日のランチ何食べようかな 🤔',
    ]

    return {
        id: generateUUID(),
        channelId: channel.id,
        userId: author.id,
        content: randomPick(messageTexts),
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        stamps,
        pinned: Math.random() > 0.9,
        embed: Math.random() > 0.7 ? { content: 'https://example.com/embed' } : null,
        ...overrides,
    }
}

// メッセージプール（50件）
const MESSAGE_POOL: Message[] = Array.from({ length: 50 }, () => generateMockMessage())

// 新着メッセージ用プール
let pendingNewMessages: Message[] = []

// ============================================
// 4. 1m26_1 API ハンドラー（生成型を利用）
// ============================================

const oneMonthonHandlers = [
    // GET /api/users/me → ApiUser を返す
    http.get(apiUrl('/api/users/me'), async () => {
        await simulateNetworkDelay(200, 400)
        const response: ApiUser = {
            id: CURRENT_USER.id,
            userId: CURRENT_USER.name,
            name: CURRENT_USER.displayName,
        }
        return HttpResponse.json(response)
    }),

    // GET /api/users/:userId → ApiUserProfile を返す
    http.get(apiUrl('/api/users/:userId'), async ({ params }) => {
        await simulateNetworkDelay(150, 300)
        const { userId } = params
        const user = MOCK_USERS.find((u) => u.name === userId) || CURRENT_USER
        const response: ApiUserProfile = {
            id: user.id,
            userId: user.name,
            name: user.displayName,
            messageCount: randomInt(10, 500),
            stampCount: randomInt(5, 200),
        }
        return HttpResponse.json(response)
    }),

    // GET /api/timeline → sortByPopularity クエリで並び順を切り替える
    http.get(apiUrl('/api/timeline'), async ({ request }) => {
        await simulateNetworkDelay(300, 700)
        const isPopular: ApiSortByPopularity =
            new URL(request.url).searchParams.get('sortByPopularity') === 'true'

        let messageIds = MESSAGE_POOL.map((m) => m.id)
        if (isPopular) {
            messageIds = [...messageIds].sort((a, b) => {
                const aMsg = MESSAGE_POOL.find((m) => m.id === a)
                const bMsg = MESSAGE_POOL.find((m) => m.id === b)
                const aCount = aMsg?.stamps?.reduce((sum, s) => sum + s.count, 0) || 0
                const bCount = bMsg?.stamps?.reduce((sum, s) => sum + s.count, 0) || 0
                return bCount - aCount
            })
        } else {
            messageIds = [...messageIds].sort((a, b) => {
                const aMsg = MESSAGE_POOL.find((m) => m.id === a)
                const bMsg = MESSAGE_POOL.find((m) => m.id === b)
                return (
                    new Date(bMsg?.createdAt || 0).getTime() -
                    new Date(aMsg?.createdAt || 0).getTime()
                )
            })
        }

        const limited = messageIds.slice(0, 30)
        const response: ApiTimelineMessage = { messages: limited }
        return HttpResponse.json(response)
    }),

    // GET /api/timeline/new → 新着がなければ 204 を返す
    http.get(apiUrl('/api/timeline/new'), async () => {
        await simulateNetworkDelay(150, 350)

        // ポーリングのたびに一定確率で新着を発生させ、200 と 204 の両方を再現する。
        if (pendingNewMessages.length === 0 && Math.random() > 0.3) {
            pendingNewMessages.push(generateMockMessage())
        }

        if (pendingNewMessages.length === 0) {
            return new HttpResponse(null, { status: 204 })
        }
        const newIds = pendingNewMessages.map((m) => m.id)
        MESSAGE_POOL.unshift(...pendingNewMessages)
        pendingNewMessages = []
        const response: ApiTimelineMessage = { messages: newIds }
        return HttpResponse.json(response)
    }),

    // GET /api/ws
    http.get(apiUrl('/api/ws'), () => {
        return HttpResponse.json({ message: 'WebSocket endpoint (handled by real WS)' })
    }),
]

// ============================================
// 5. traQ API v3 ハンドラー（修正済み）
// ============================================

const traqHandlers = [
    // ---------- ユーザーAPI ----------
    http.get('https://q.trap.jp/api/v3/users/me', async () => {
        await simulateNetworkDelay(100, 300)
        return HttpResponse.json(CURRENT_USER)
    }),

    http.get('https://q.trap.jp/api/v3/users/:userId', async ({ params }) => {
        await simulateNetworkDelay(100, 300)
        const { userId } = params
        const user = MOCK_USERS.find((u) => u.id === userId || u.name === userId)
        if (!user) {
            return new HttpResponse(JSON.stringify({ message: 'ユーザーが見つかりません' }), {
                status: 404,
            })
        }
        return HttpResponse.json(user)
    }),

    http.get('https://q.trap.jp/api/v3/users', async () => {
        await simulateNetworkDelay(200, 400)
        return HttpResponse.json(MOCK_USERS)
    }),

    // ---------- チャンネルAPI ----------
    http.get('https://q.trap.jp/api/v3/channels', async () => {
        await simulateNetworkDelay(150, 300)
        const response: ChannelsResponse = {
            public: MOCK_PUBLIC_CHANNELS,
            dm: MOCK_DM_CHANNELS,
        }
        return HttpResponse.json(response)
    }),

    http.get(
        'https://q.trap.jp/api/v3/channels/:channelId/messages',
        async ({ params, request }) => {
            await simulateNetworkDelay(200, 500)

            const { channelId } = params
            const url = new URL(request.url)
            const limit = parseInt(url.searchParams.get('limit') || '50', 10)
            const offset = parseInt(url.searchParams.get('offset') || '0', 10)
            const since = url.searchParams.get('since')
            const until = url.searchParams.get('until')
            const order = url.searchParams.get('order') || 'desc'

            let messages = MESSAGE_POOL.filter((m) => m.channelId === channelId)
            if (messages.length === 0) {
                messages = Array.from({ length: randomInt(5, 20) }, () =>
                    generateMockMessage({ channelId: channelId as string }),
                )
                MESSAGE_POOL.push(...messages)
            }

            if (since) {
                const sinceDate = new Date(since)
                messages = messages.filter((m) => new Date(m.createdAt) >= sinceDate)
            }
            if (until) {
                const untilDate = new Date(until)
                messages = messages.filter((m) => new Date(m.createdAt) <= untilDate)
            }

            messages = [...messages].sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime()
                const bTime = new Date(b.createdAt).getTime()
                return order === 'asc' ? aTime - bTime : bTime - aTime
            })

            const paginated = messages.slice(offset, offset + limit)
            const hasMore = messages.length > offset + limit

            return HttpResponse.json(paginated, {
                headers: {
                    'X-TRAQ-MORE': hasMore ? 'true' : 'false',
                },
            })
        },
    ),

    http.post(
        'https://q.trap.jp/api/v3/channels/:channelId/messages',
        async ({ params, request }) => {
            await simulateNetworkDelay(200, 400)
            const { channelId } = params
            const body = (await request.json()) as { content: string; embed?: boolean }
            const newMessage = generateMockMessage({
                channelId: channelId as string,
                content: body.content,
            })
            MESSAGE_POOL.unshift(newMessage)
            return HttpResponse.json(newMessage, { status: 201 })
        },
    ),

    // ---------- 個別メッセージAPI ----------
    http.get('https://q.trap.jp/api/v3/messages/:messageId', async ({ params }) => {
        await simulateNetworkDelay(100, 300)
        const { messageId } = params
        const message = MESSAGE_POOL.find((m) => m.id === messageId)
        if (!message) {
            return new HttpResponse(JSON.stringify({ message: 'メッセージが見つかりません' }), {
                status: 404,
            })
        }
        return HttpResponse.json(message)
    }),

    http.put('https://q.trap.jp/api/v3/messages/:messageId', async ({ params, request }) => {
        await simulateNetworkDelay(150, 350)
        const { messageId } = params
        const body = (await request.json()) as { content: string }
        const message = MESSAGE_POOL.find((m) => m.id === messageId)
        if (!message) {
            return new HttpResponse(JSON.stringify({ message: 'メッセージが見つかりません' }), {
                status: 404,
            })
        }
        message.content = body.content
        message.updatedAt = new Date().toISOString()
        return new HttpResponse(null, { status: 204 })
    }),

    http.delete('https://q.trap.jp/api/v3/messages/:messageId', async ({ params }) => {
        await simulateNetworkDelay(100, 300)
        const { messageId } = params
        const index = MESSAGE_POOL.findIndex((m) => m.id === messageId)
        if (index === -1) {
            return new HttpResponse(JSON.stringify({ message: 'メッセージが見つかりません' }), {
                status: 404,
            })
        }
        MESSAGE_POOL.splice(index, 1)
        return new HttpResponse(null, { status: 204 })
    }),

    // ---------- スタンプAPI ----------
    http.get('https://q.trap.jp/api/v3/stamps', async () => {
        await simulateNetworkDelay(100, 250)
        return HttpResponse.json(MOCK_STAMPS)
    }),

    http.get('https://q.trap.jp/api/v3/stamps/:stampId', async ({ params }) => {
        await simulateNetworkDelay(80, 200)
        const { stampId } = params
        const stamp = MOCK_STAMPS.find((s) => s.id === stampId)
        if (!stamp) {
            return new HttpResponse(JSON.stringify({ message: 'スタンプが見つかりません' }), {
                status: 404,
            })
        }
        return HttpResponse.json(stamp)
    }),

    http.get('https://q.trap.jp/api/v3/stamps/:stampId/image', async () => {
        await simulateNetworkDelay(50, 150)
        return new HttpResponse(dummyImageData, {
            headers: {
                'Content-Type': 'image/png',
            },
        })
    }),
]

// ============================================
// 6. エクスポート
// ============================================

export const handlers = [...oneMonthonHandlers, ...traqHandlers]
