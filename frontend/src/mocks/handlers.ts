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

type UserAccountState = 0 | 1 | 2

interface UserDetail {
    id: string
    state: UserAccountState
    bot: boolean
    iconFileId: string
    displayName: string
    name: string
    twitterId: string
    lastOnline: string | null
    updatedAt: string
    tags: UserTag[]
    groups: string[]
    bio: string
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

type ApiUser = components['schemas']['User']
type ApiUserProfile = components['schemas']['UserProfile']
type ApiTimelineMessage = components['schemas']['TimelineMessage']
type ApiSortByPopularity = components['schemas']['SortByPopularity']

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const apiUrl = (path: string): string => new URL(path, API_BASE_URL).toString()

// ============================================
// 2. 乱数を使わない生成ユーティリティ
// ============================================

const createUuid = (seed: number): string => {
    const suffix = seed.toString(16).padStart(12, '0')
    return `00000000-0000-4000-8000-${suffix}`
}

const stableDate = (baseDate: Date, dayOffset: number, hour: number, minute: number): string => {
    const date = new Date(baseDate)
    date.setUTCDate(date.getUTCDate() + dayOffset)
    date.setUTCHours(hour, minute, 0, 0)
    return date.toISOString()
}

const simulateNetworkDelay = async (ms: number) => {
    await delay(ms)
}

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
// 3. モックデータ生成（決定論的）
// ============================================

const generateMockUser = (index: number, overrides: Partial<UserDetail> = {}): UserDetail => {
    const displayNames = ['太郎', '花子', '次郎', 'さくら', 'ゆうた', 'めい', 'こうた', 'りな']
    const bios = [
        '自己紹介文です。よろしくお願いします！',
        'エンジニアリングが好きです 🚀',
        'Vue.jsとTypeScriptを勉強中',
        'traPで楽しく活動しています！',
        '',
    ]
    const baseDate = new Date('2025-01-01T00:00:00Z')
    const id = createUuid(1000 + index)
    const name = `user_${String(index).padStart(2, '0')}`

    const bio = bios[index % bios.length] ?? ''

    return {
        id,
        state: 1,
        bot: index % 10 === 0,
        iconFileId: createUuid(2000 + index),
        displayName: `traP ${displayNames[(index - 1) % displayNames.length]}`,
        name,
        twitterId: index % 4 === 0 ? `@${name}` : '',
        lastOnline: stableDate(baseDate, index % 20, (index * 3) % 24, (index * 7) % 60),
        updatedAt: stableDate(baseDate, index % 20, (index * 5) % 24, (index * 11) % 60),
        tags: [],
        groups: [],
        bio,
        homeChannel: index % 3 === 0 ? createUuid(3000 + index) : null,
        ...overrides,
    }
}

const MOCK_USERS: UserDetail[] = Array.from({ length: 10 }, (_, index) =>
    generateMockUser(index + 1),
)

const CURRENT_USER: UserDetail = MOCK_USERS[0] ?? generateMockUser(1)

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
    { id: 'dm-001', userId: MOCK_USERS[1]?.id || createUuid(9999) },
    { id: 'dm-002', userId: MOCK_USERS[2]?.id || createUuid(9998) },
]

const generateMockStamp = (index: number, overrides: Partial<Stamp> = {}): Stamp => {
    const names = ['👍', '❤️', '😂', '🔥', '🤔', '🎉', '💯', '✨', '🚀', '👀']
    const baseDate = new Date('2025-01-01T00:00:00Z')
    const creatorId = MOCK_USERS[(index + 1) % MOCK_USERS.length]?.id ?? CURRENT_USER.id
    const isUnicode = index % 2 === 0

    const stampName = isUnicode
        ? (names[index % names.length] ?? '👍')
        : `stamp_${String(index).padStart(2, '0')}`

    return {
        id: createUuid(4000 + index),
        name: stampName,
        creatorId,
        createdAt: stableDate(baseDate, index % 12, (index * 2) % 24, (index * 5) % 60),
        updatedAt: stableDate(baseDate, index % 12, (index * 3) % 24, (index * 7) % 60),
        fileId: createUuid(5000 + index),
        isUnicode,
        hasThumbnail: index % 3 !== 0,
        ...overrides,
    }
}

const MOCK_STAMPS: Stamp[] = Array.from({ length: 10 }, (_, index) => generateMockStamp(index + 1))

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

const generateMockMessage = (index: number, overrides: Partial<Message> = {}): Message => {
    const author = MOCK_USERS[index % MOCK_USERS.length] ?? CURRENT_USER
    const fallbackChannel = MOCK_PUBLIC_CHANNELS[0]
    if (!fallbackChannel) {
        throw new Error('MOCK_PUBLIC_CHANNELS is empty')
    }
    const channel = MOCK_PUBLIC_CHANNELS[index % MOCK_PUBLIC_CHANNELS.length] ?? fallbackChannel
    const baseDate = new Date('2025-01-01T00:00:00Z')
    const createdAt = stableDate(baseDate, index % 30, (index * 3) % 24, (index * 7) % 60)
    const stampCount = index % 5
    const stamps: MessageStamp[] = Array.from({ length: stampCount }, (_, offset) => {
        const fallbackStamp = MOCK_STAMPS[0]
        if (!fallbackStamp) {
            throw new Error('MOCK_STAMPS is empty')
        }
        const stamp = MOCK_STAMPS[(index + offset) % MOCK_STAMPS.length] ?? fallbackStamp
        return {
            stampId: stamp.id,
            count: ((index + offset + 1) % 9) + 1,
            createdAt,
            updatedAt: createdAt,
            userId: MOCK_USERS[(index + offset + 1) % MOCK_USERS.length]?.id ?? CURRENT_USER.id,
        }
    })
    const content = (messageTexts[index % messageTexts.length] ?? messageTexts[0]) as string

    return {
        id: createUuid(6000 + index),
        channelId: channel.id,
        userId: author.id,
        content,
        createdAt,
        updatedAt: createdAt,
        stamps,
        pinned: index % 11 === 0,
        embed: index % 7 === 0 ? { content: 'https://example.com/embed' } : null,
        ...overrides,
    }
}

const MESSAGE_POOL: Message[] = Array.from({ length: 50 }, (_, index) =>
    generateMockMessage(index + 1),
)

let pendingNewMessages: Message[] = [generateMockMessage(101, { channelId: 'c-001' })]

// ============================================
// 4. 1m26_1 API ハンドラー
// ============================================

const oneMonthonHandlers = [
    http.get(apiUrl('/api/users/me'), async () => {
        await simulateNetworkDelay(200)
        const response: ApiUser = {
            id: CURRENT_USER.id,
            userId: CURRENT_USER.name,
            name: CURRENT_USER.displayName,
        }
        return HttpResponse.json(response)
    }),

    http.get(apiUrl('/api/users/:userId'), async ({ params }) => {
        await simulateNetworkDelay(180)
        const { userId } = params
        const user = MOCK_USERS.find((u) => u.name === userId) || CURRENT_USER
        const response: ApiUserProfile = {
            id: user.id,
            userId: user.name,
            name: user.displayName,
            messageCount: 120 + Number.parseInt(user.id.slice(-2), 16),
            stampCount: 40 + Number.parseInt(user.id.slice(-1), 16),
        }
        return HttpResponse.json(response)
    }),

    http.get(apiUrl('/api/timeline'), async ({ request }) => {
        await simulateNetworkDelay(400)
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

    http.get(apiUrl('/api/timeline/new'), async () => {
        await simulateNetworkDelay(200)

        if (pendingNewMessages.length === 0) {
            return new HttpResponse(null, { status: 204 })
        }

        const newIds = pendingNewMessages.map((m) => m.id)
        MESSAGE_POOL.unshift(...pendingNewMessages)
        pendingNewMessages = []
        const response: ApiTimelineMessage = { messages: newIds }
        return HttpResponse.json(response)
    }),

    http.get(apiUrl('/api/ws'), () => {
        return HttpResponse.json({ message: 'WebSocket endpoint (handled by real WS)' })
    }),
]

// ============================================
// 5. traQ API v3 ハンドラー
// ============================================

const traqHandlers = [
    http.get('https://q.trap.jp/api/v3/users/me', async () => {
        await simulateNetworkDelay(150)
        return HttpResponse.json(CURRENT_USER)
    }),

    http.get('https://q.trap.jp/api/v3/users/:userId', async ({ params }) => {
        await simulateNetworkDelay(180)
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
        await simulateNetworkDelay(250)
        return HttpResponse.json(MOCK_USERS)
    }),

    http.get('https://q.trap.jp/api/v3/channels', async () => {
        await simulateNetworkDelay(200)
        const response: ChannelsResponse = {
            public: MOCK_PUBLIC_CHANNELS,
            dm: MOCK_DM_CHANNELS,
        }
        return HttpResponse.json(response)
    }),

    http.get(
        'https://q.trap.jp/api/v3/channels/:channelId/messages',
        async ({ params, request }) => {
            await simulateNetworkDelay(300)

            const { channelId } = params
            const url = new URL(request.url)
            const limit = parseInt(url.searchParams.get('limit') || '50', 10)
            const offset = parseInt(url.searchParams.get('offset') || '0', 10)
            const since = url.searchParams.get('since')
            const until = url.searchParams.get('until')
            const order = url.searchParams.get('order') || 'desc'

            let messages = MESSAGE_POOL.filter((m) => m.channelId === channelId)
            if (messages.length === 0) {
                const generatedMessages = Array.from({ length: 8 }, (_, index) =>
                    generateMockMessage(100 + index, { channelId: channelId as string }),
                )
                MESSAGE_POOL.push(...generatedMessages)
                messages = generatedMessages
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
            await simulateNetworkDelay(250)
            const { channelId } = params
            const body = (await request.json()) as { content: string; embed?: boolean }
            const newMessage = generateMockMessage(200 + MESSAGE_POOL.length, {
                channelId: channelId as string,
                content: body.content,
            })
            MESSAGE_POOL.unshift(newMessage)
            return HttpResponse.json(newMessage, { status: 201 })
        },
    ),

    http.get('https://q.trap.jp/api/v3/messages/:messageId', async ({ params }) => {
        await simulateNetworkDelay(150)
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
        await simulateNetworkDelay(180)
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
        await simulateNetworkDelay(150)
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

    http.get('https://q.trap.jp/api/v3/stamps', async () => {
        await simulateNetworkDelay(120)
        return HttpResponse.json(MOCK_STAMPS)
    }),

    http.get('https://q.trap.jp/api/v3/stamps/:stampId', async ({ params }) => {
        await simulateNetworkDelay(100)
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
        await simulateNetworkDelay(80)
        return new HttpResponse(dummyImageData, {
            headers: {
                'Content-Type': 'image/png',
            },
        })
    }),
]

export const handlers = [...oneMonthonHandlers, ...traqHandlers]
