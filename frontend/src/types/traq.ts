/**
 * traQ API v3 のレスポンススキーマに準拠した型定義
 * @see https://apis.trap.jp/
 *
 * 使用方法:
 * import type { components } from '@/types/traq'
 * type User = components['schemas']['UserDetail']
 */

// ============================================
// 1. コア型定義（内部で使用）
// ============================================

/**
 * ユーザータグ
 */
interface UserTag {
    /** タグUUID */
    tagId: string
    /** タグ名 */
    tag: string
    /** ロックされているか */
    isLocked: boolean
    /** 作成日時 (ISO 8601) */
    createdAt: string
    /** 更新日時 (ISO 8601) */
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
 * ユーザー詳細情報
 * GET /users/me, GET /users/{userId} のレスポンス
 */
interface UserDetail {
    /** ユーザーUUID */
    id: string
    /** アカウント状態 (0: 停止, 1: 有効, 2: 一時停止) */
    state: UserAccountState
    /** BOTかどうか */
    bot: boolean
    /** アイコンファイルUUID */
    iconFileId: string
    /** 表示名 (最大32文字) */
    displayName: string
    /** ユーザー名 (traQ ID) */
    name: string
    /** Twitter ID (連携していない場合は空文字) */
    twitterId: string
    /** 最終オンライン日時 (オフラインの場合は null) */
    lastOnline: string | null
    /** 更新日時 */
    updatedAt: string
    /** ユーザータグ一覧 */
    tags: UserTag[]
    /** 所属グループUUIDの配列 */
    groups: string[]
    /** 自己紹介 (最大1000文字) */
    bio: string
    /** ホームチャンネルUUID (設定していない場合は null) */
    homeChannel: string | null
}

/**
 * 公開チャンネル情報
 */
interface PublicChannel {
    /** チャンネルUUID */
    id: string
    /** 親チャンネルUUID (ルートの場合は null) */
    parentId: string | null
    /** アーカイブ済みか */
    archived: boolean
    /** 強制通知チャンネルか */
    force: boolean
    /** チャンネルトピック */
    topic: string
    /** チャンネル名 */
    name: string
    /** 子チャンネルUUIDの配列 */
    children: string[]
}

/**
 * DMチャンネル情報
 */
interface DMChannel {
    /** DMチャンネルUUID */
    id: string
    /** 相手ユーザーUUID */
    userId: string
}

/**
 * チャンネル一覧レスポンス
 * GET /channels のレスポンス
 */
interface ChannelsResponse {
    /** 公開チャンネル一覧（ツリー構造） */
    public: PublicChannel[]
    /** DMチャンネル一覧 */
    dm: DMChannel[]
}

/**
 * チャンネルパス情報
 */
interface ChannelPath {
    path: string
}

/**
 * スタンプ情報
 * GET /stamps のレスポンス要素
 */
interface Stamp {
    /** スタンプUUID */
    id: string
    /** スタンプ名 */
    name: string
    /** 作成者ユーザーUUID */
    creatorId: string
    /** 作成日時 */
    createdAt: string
    /** 更新日時 */
    updatedAt: string
    /** ファイルUUID (アップロードされた画像) */
    fileId: string
    /** Unicode絵文字スタンプか */
    isUnicode: boolean
    /** サムネイルを持つか */
    hasThumbnail: boolean
}

/**
 * メッセージに付与されたスタンプ情報
 * Message.stamps の要素
 */
interface MessageStamp {
    /** スタンプUUID */
    stampId: string
    /** 付与された回数 */
    count: number
    /** 最初に付与された日時 */
    createdAt: string
    /** 最後に更新された日時 */
    updatedAt: string
    /** 最初に付与したユーザーUUID */
    userId: string
}

/**
 * メッセージ情報
 * GET /channels/{channelId}/messages のレスポンス要素
 * GET /messages/{messageId} のレスポンス
 */
export interface Message {
    /** メッセージUUID */
    id: string
    /** 投稿先チャンネルUUID */
    channelId: string
    /** 投稿者ユーザーUUID */
    userId: string
    /** 本文 (最大2000文字) */
    content: string
    /** 作成日時 */
    createdAt: string
    /** 更新日時 */
    updatedAt: string
    /** スタンプ情報一覧 */
    stamps: MessageStamp[]
    /** ピン留めされているか */
    pinned: boolean
    /** 埋め込み情報 (存在しない場合は null) */
    embed: { content: string } | null
}

// ============================================
// 2. エクスポート（components 形式）
// ============================================

/**
 * traQ API v3 のスキーマ定義（OpenAPI スタイル）
 * 使用例: type User = components['schemas']['UserDetail']
 */
export interface traQcomponents {
    schemas: {
        /** ユーザータグ */
        UserTag: UserTag
        /** ユーザーアカウント状態 (0:停止, 1:有効, 2:一時停止) */
        UserAccountState: UserAccountState
        /** ユーザー詳細情報 */
        UserDetail: UserDetail
        /** 公開チャンネル情報 */
        PublicChannel: PublicChannel
        /** DMチャンネル情報 */
        DMChannel: DMChannel
        /** チャンネル一覧レスポンス */
        ChannelsResponse: ChannelsResponse
        /** チャンネルパス情報 */
        ChannelPath: ChannelPath
        /** スタンプ情報 */
        Stamp: Stamp
        /** メッセージスタンプ情報 */
        MessageStamp: MessageStamp
        /** メッセージ情報 */
        Message: Message
    }
}
