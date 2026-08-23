import { http, HttpResponse, delay, ws } from 'msw'
import type { components } from '@/gen/api-types'
import type { traQcomponents } from '@/types/traq'

// ============================================
// 1. 型定義（traQ API v3 用・手動定義）
// ============================================

type UserDetail = traQcomponents['schemas']['UserDetail']
type PublicChannel = traQcomponents['schemas']['PublicChannel']
type DMChannel = traQcomponents['schemas']['DMChannel']
type ChannelsResponse = traQcomponents['schemas']['ChannelsResponse']
type Stamp = traQcomponents['schemas']['Stamp']
type MessageStamp = traQcomponents['schemas']['MessageStamp']
type Message = traQcomponents['schemas']['Message']

type ApiUser = components['schemas']['User']
type ApiUserProfile = components['schemas']['UserProfile']
type ApiTimelineMessage = components['schemas']['TimelineMessage']
type ApiSortByPopularity = components['schemas']['SortByPopularity']

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const apiUrl = (path: string): string => new URL(path, API_BASE_URL).toString()

// ============================================
// 2. ユーティリティ関数
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

// ダミー画像（1x1 PNG）
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
// 3. モックデータ（実データ + ダミー）
// ============================================

// ---------- ユーザー（実データ 6名） ----------
const MOCK_USERS: UserDetail[] = [
    {
        id: '019d670f-46e0-7b52-87ba-2b61f8fb96eb',
        state: 1,
        bot: false,
        iconFileId: '019d6799-1d1f-7d2b-9ac8-df2b7f67ba2f',
        displayName: 'konryu',
        name: 'konryu',
        twitterId: 'konryu__',
        lastOnline: '2026-08-21T07:15:17.645543Z',
        updatedAt: '2026-08-21T07:15:17.662789Z',
        tags: [
            {
                tagId: '019e67ff-8aa3-748d-b94f-6ba595dc6837',
                tag: '関数アート',
                isLocked: true,
                createdAt: '2026-05-27T05:54:20.982396Z',
                updatedAt: '2026-08-20T15:41:57.008132Z',
            },
        ],
        groups: [
            '01941652-6552-73f2-a2b3-d9adffc1d85c',
            '019a76c3-5fda-7259-9d85-d9b98a5d1372',
            '019d6605-de57-76c5-8c32-59a74e1fa2a4',
            '019e5476-7f2d-7fb5-808c-3ca046cedacb',
            '019f0f14-1e06-753f-b505-1b357339f612',
            '019f375f-68ec-769b-9ccc-86146e0ab5a3',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            '019fd7b3-800d-7769-a0d1-d189aadd7696',
            '2adb939e-2435-42bc-8bfa-d29ee7ec36f0',
            '34815109-4bbf-4574-aa1b-3056a9f01434',
            '867b3529-696f-4bd1-af53-1947eba92e77',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
        ],
        bio: '関数アート周辺をすべてやる\n:Desmos:が使えます',
        homeChannel: '019d6718-fad5-7ba1-a584-74210c17efa8',
    },
    {
        id: '019d670b-dade-7b28-8081-e51db35d6cf7',
        state: 1,
        bot: false,
        iconFileId: '019d673a-3f5a-7c69-93f4-d895924a1eb0',
        displayName: 'Ayuto',
        name: 'Ayuto1123',
        twitterId: '',
        lastOnline: '2026-08-21T08:59:49.557721Z',
        updatedAt: '2026-08-21T08:59:49.572247Z',
        tags: [
            {
                tagId: '019dd1e2-9cb7-7445-b2b2-55f54c6b30cf',
                tag: '26BtraQidの末尾数字族',
                isLocked: false,
                createdAt: '2026-05-28T00:55:14.36296Z',
                updatedAt: '2026-06-14T03:39:28.317631Z',
            },
        ],
        groups: [
            '01941652-6552-73f2-a2b3-d9adffc1d85c',
            '019d6605-de57-76c5-8c32-59a74e1fa2a4',
            '019edf50-c0e5-760a-afe3-7320ed8d8a11',
            '019ee81c-25bc-758b-addb-3f7de0a77dd6',
            '019f0f14-1e06-753f-b505-1b357339f612',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            '019fd7b3-800d-7769-a0d1-d189aadd7696',
            'cabd58b1-8bc4-4a1a-9f3d-997ed95aaaae',
            'ec54d385-e5e7-4554-8aa2-878ebedc9db0',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
        ],
        bio: 'JKになりたい',
        homeChannel: '019d671f-67fc-7bb8-9d3c-430b8ae4bbdc',
    },
    {
        id: '019d66ff-2b7d-7aa0-8b9c-25a5def34fbc',
        state: 1,
        bot: false,
        iconFileId: '019d6706-e7dc-7af8-807d-bee1e725b48d',
        displayName: 'Hokubu Railway',
        name: 'HokubuRailway',
        twitterId: 'hokubuR_green',
        lastOnline: '2026-08-21T09:29:20.780636Z',
        updatedAt: '2026-08-21T09:29:20.79652Z',
        tags: [
            {
                tagId: '019d6729-e31b-7bf5-842a-e62591450c80',
                tag: '26B最速times子チャンネル作成',
                isLocked: true,
                createdAt: '2026-04-07T08:58:11.629454Z',
                updatedAt: '2026-05-27T06:46:14.897897Z',
            },
            {
                tagId: '019d6bfc-f2c2-78bc-8a28-3e99720b340f',
                tag: '26B最速スタンプ作成',
                isLocked: true,
                createdAt: '2026-04-08T07:27:12.586488Z',
                updatedAt: '2026-05-27T06:46:15.295582Z',
            },
            {
                tagId: '019e6804-1f46-74a1-97c9-f3486802d321',
                tag: '最上川検出bot',
                isLocked: true,
                createdAt: '2026-05-27T05:59:21.191115Z',
                updatedAt: '2026-05-27T06:01:22.471637Z',
            },
            {
                tagId: '019e6810-0f20-74b8-9bad-90cf454adca1',
                tag: '単色',
                isLocked: false,
                createdAt: '2026-05-27T06:12:23.470909Z',
                updatedAt: '2026-05-27T06:12:23.470909Z',
            },
            {
                tagId: '019e6818-0363-74bd-82a3-97c01bda1b50',
                tag: '↑ 実は単色ではない',
                isLocked: true,
                createdAt: '2026-05-27T06:21:04.757187Z',
                updatedAt: '2026-05-27T06:21:10.207475Z',
            },
            {
                tagId: '019e682d-0f1d-74cf-9f4c-3ee440b1dc4e',
                tag: 'まあ確かに寝ないと fken 康になっちゃうからな…',
                isLocked: false,
                createdAt: '2026-05-27T06:44:04.014622Z',
                updatedAt: '2026-05-27T06:44:04.014622Z',
            },
            {
                tagId: '01912667-6838-77f0-944e-a6781fc88086',
                tag: '最上川bot',
                isLocked: true,
                createdAt: '2026-05-27T06:44:32.098993Z',
                updatedAt: '2026-05-27T06:46:08.386441Z',
            },
        ],
        groups: [
            '01941652-6552-73f2-a2b3-d9adffc1d85c',
            '019c3dbd-9d03-76db-a92c-4626898d8405',
            '019d6605-de57-76c5-8c32-59a74e1fa2a4',
            '019da41e-c836-7fa2-9c85-9e8746084e05',
            '019e0af7-4c93-7498-a480-1a090dd08ef1',
            '019edb17-0351-7d7c-a7ad-0845f65c2463',
            '019edf50-c0e5-760a-afe3-7320ed8d8a11',
            '019ee80c-7e87-7506-84a7-a469881f3881',
            '019f0f14-1e06-753f-b505-1b357339f612',
            '019f1356-428e-7c83-80c4-e2abd648f4d3',
            '019f1cad-1953-7c11-99a0-f4e530166beb',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            '019fd7b3-800d-7769-a0d1-d189aadd7696',
            '2adb939e-2435-42bc-8bfa-d29ee7ec36f0',
            '8adf7a0a-a6c8-4f9c-bf10-656d388ed651',
            'cabd58b1-8bc4-4a1a-9f3d-997ed95aaaae',
            'cb977ab2-85fa-4953-ac4d-809eaef427e6',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
        ],
        bio: '**状態：**\n気象通報の記録を停止しています。\n大富豪ボットはバグ修正を終了しました。\n麻雀ボットは現在開発中です。\n\n**最近の作品** ↓\n$$\\colorbox{white}{\\raisebox{-1.6em}{\\hspace{-0.2em}\\textcolor{red}{\\hugeと\\hspace{-0.24em}\\Largeあ}\\!\\!\\textcolor{orangered}{\\large\\raisebox{0.9ex}{る}\\!{\\huge科}\\hspace{-0.1em}\\textcolor{orangered}{\\Large{学\\hspace{-0.1em}の}}}}}\\\\{\\colorbox{white}{\\hspace{0.47em}\\colorbox{red}{\\hspace{-0.33em}\\textcolor{white}{\\huge超\\hspace{-0.17em}}}\\hspace{-0.08em}{\\raisebox{0.8ex}{\\textcolor{red}{\\LARGE電\\hspace{-0.08em}磁}}\\llap{\\raisebox{-0.6ex}{\\textcolor{red}{\\sf\\tinyレ\\hspace{0.15em}ー\\hspace{0.15em}ル\\hspace{0.15em}ガ\\hspace{0.15em}ン\\hspace{0.1em}}}}\\hspace{-0.08em}\\textcolor{red}{\\huge砲}\\hspace{0.47em}}}}$$',
        homeChannel: '019d6708-7b34-7b03-b9ad-6083d810c7dd',
    },
    {
        id: '019d66bb-a973-799a-9984-3c4bd40d202b',
        state: 1,
        bot: false,
        iconFileId: '019eb4f3-aa09-78fb-9a93-effb31bcc589',
        displayName: 'photon',
        name: 'photon',
        twitterId: '',
        lastOnline: '2026-08-21T02:16:28.809883Z',
        updatedAt: '2026-08-21T02:16:28.820783Z',
        tags: [],
        groups: [
            '01941652-6552-73f2-a2b3-d9adffc1d85c',
            '019d6605-de57-76c5-8c32-59a74e1fa2a4',
            '019e8149-9216-7d89-85be-c73e27c75510',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            '280bf56d-fa22-46bc-8dcc-6367d600d873',
            '867b3529-696f-4bd1-af53-1947eba92e77',
            'af240e80-8526-4f21-925e-b20eded06284',
            'c5670065-75d4-4851-bfba-9ff05201fc44',
            'cb977ab2-85fa-4953-ac4d-809eaef427e6',
            'ec54d385-e5e7-4554-8aa2-878ebedc9db0',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
        ],
        bio: '',
        homeChannel: '019d66c2-f0da-79af-bf6c-e34d53da31f1',
    },
    {
        id: '01960f52-fc2d-7ed5-b95f-4740376ca818',
        state: 1,
        bot: false,
        iconFileId: '01960f5d-e37f-7f05-a314-6afc2a3f4730',
        displayName: 'はるき',
        name: 'haruki_0920',
        twitterId: '',
        lastOnline: '2026-08-21T03:27:01.670719Z',
        updatedAt: '2026-08-21T03:27:01.682182Z',
        tags: [
            {
                tagId: '0198d068-2708-7b45-9d28-e24718181940',
                tag: '25BtraQidの末尾数字族',
                isLocked: false,
                createdAt: '2025-08-23T08:56:48.583432Z',
                updatedAt: '2025-08-23T08:56:48.583432Z',
            },
        ],
        groups: [
            '0196108c-a04a-730e-a411-92446acd21b1',
            '019edf50-c0e5-760a-afe3-7320ed8d8a11',
            '019ee772-a35b-72ac-a9a5-734e5d32ffb1',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            'b14a543d-e876-42cc-98d2-cf20a9549edb',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
        ],
        bio: '',
        homeChannel: '01960f62-3167-7f25-a482-6b46d3bcd5c7',
    },
    {
        id: '01960efa-f1ed-7d54-bf3d-6d62fe8af5aa',
        state: 1,
        bot: false,
        iconFileId: '0198e6be-1b29-7f53-9f66-552c79c47b47',
        displayName: 'やさこ',
        name: 'yasako',
        twitterId: 'yas__ako',
        lastOnline: '2026-08-21T08:55:55.695898Z',
        updatedAt: '2026-08-21T08:55:55.708737Z',
        tags: [
            {
                tagId: '01967d1c-1be9-7383-b788-995fd5fa8646',
                tag: 'traP本名みたいな名前班',
                isLocked: true,
                createdAt: '2025-05-10T09:59:11.949748Z',
                updatedAt: '2025-05-13T14:45:20.944402Z',
            },
            {
                tagId: '0196a5b2-7fb8-72d0-9923-5eee80248d28',
                tag: '25BLaTeX部',
                isLocked: true,
                createdAt: '2025-05-10T11:25:09.114128Z',
                updatedAt: '2025-05-13T14:45:20.462363Z',
            },
            {
                tagId: '0196c882-81b1-75bb-9ce8-4d9972ab2a83',
                tag: '24.8B',
                isLocked: true,
                createdAt: '2025-05-13T07:20:59.275335Z',
                updatedAt: '2025-05-13T14:45:19.997136Z',
            },
            {
                tagId: '0196d1d1-f817-784b-841c-6a99f0888568',
                tag: '25B 投稿数1000件突破2番',
                isLocked: true,
                createdAt: '2025-05-15T02:42:00.861877Z',
                updatedAt: '2025-06-17T01:02:11.26264Z',
            },
            {
                tagId: '0196d9a4-c030-7e20-8083-b783c71b6987',
                tag: 'traQ落とした(2025/5/16)',
                isLocked: true,
                createdAt: '2025-05-16T15:09:35.161301Z',
                updatedAt: '2025-06-17T01:02:11.906455Z',
            },
            {
                tagId: '8b7793c9-58d4-4a83-bef7-111041bbff8d',
                tag: 'ttaQブレイカー',
                isLocked: true,
                createdAt: '2025-05-16T23:33:10.013646Z',
                updatedAt: '2025-06-17T01:02:12.588856Z',
            },
            {
                tagId: '61790c57-999a-4732-a6d4-cfc21d7016d5',
                tag: 'traQを落とした',
                isLocked: true,
                createdAt: '2025-05-23T07:45:33.136143Z',
                updatedAt: '2025-06-17T01:02:13.788375Z',
            },
            {
                tagId: '0197078b-e7da-74d8-8530-2b326cca69f8',
                tag: '同じ内容に三つもタグがつく人',
                isLocked: true,
                createdAt: '2025-05-25T13:04:58.850698Z',
                updatedAt: '2025-06-17T01:02:16.739319Z',
            },
            {
                tagId: '01970798-258b-7500-90c9-0f4786598543',
                tag: 'すいまくんほどタグがつくことはないでしょう',
                isLocked: true,
                createdAt: '2025-05-25T13:18:21.075117Z',
                updatedAt: '2025-06-17T01:02:17.72636Z',
            },
            {
                tagId: '0196a06d-a202-7c6c-9a04-593d7b688abf',
                tag: '25Bカラオケ仲間',
                isLocked: true,
                createdAt: '2025-05-29T11:17:56.065646Z',
                updatedAt: '2025-06-17T01:02:18.99086Z',
            },
            {
                tagId: '01973378-c689-7b74-9653-3428ba2d2e16',
                tag: '手、ケガするよ',
                isLocked: true,
                createdAt: '2025-06-03T01:47:22.642556Z',
                updatedAt: '2025-06-17T01:02:19.409374Z',
            },
            {
                tagId: '01973378-d739-7b74-861f-0beb87e4c80d',
                tag: '足ケガするよ',
                isLocked: true,
                createdAt: '2025-06-03T01:47:26.911647Z',
                updatedAt: '2025-06-17T01:02:21.673229Z',
            },
            {
                tagId: '01975274-ac2f-759c-9f8d-0b8746cf0787',
                tag: 'HACATON',
                isLocked: true,
                createdAt: '2025-06-09T02:11:07.448195Z',
                updatedAt: '2025-07-26T16:47:44.953438Z',
            },
            {
                tagId: '01972fff-81b2-75ce-a204-01f1380f4203',
                tag: '脇腹弱い',
                isLocked: true,
                createdAt: '2025-06-11T04:15:44.355578Z',
                updatedAt: '2025-07-26T16:47:45.332893Z',
            },
            {
                tagId: '019785f9-324d-706d-87c3-8ecc21608d37',
                tag: 'きななー',
                isLocked: true,
                createdAt: '2025-06-19T02:16:30.554287Z',
                updatedAt: '2025-07-26T16:47:45.811671Z',
            },
            {
                tagId: '0197a0fb-59f6-7d94-9bcf-542f5de9fb15',
                tag: '25BtraPer検知精度全一',
                isLocked: true,
                createdAt: '2025-06-24T08:08:36.606763Z',
                updatedAt: '2025-07-26T16:47:46.219732Z',
            },
            {
                tagId: '0197ea27-45c3-779f-979c-a7bc5ca0e796',
                tag: '女装班',
                isLocked: true,
                createdAt: '2025-07-08T13:08:51.789917Z',
                updatedAt: '2025-07-26T16:47:46.631409Z',
            },
            {
                tagId: '0197ea27-b3eb-77a5-8fa8-7dba8a2b58c0',
                tag: '女装部',
                isLocked: true,
                createdAt: '2025-07-08T13:09:19.986741Z',
                updatedAt: '2025-07-26T16:47:48.363258Z',
            },
            {
                tagId: '0196339f-c88e-79cb-8bbb-aa303a6a7956',
                tag: 'スタンプボマー',
                isLocked: true,
                createdAt: '2025-07-13T00:33:07.479949Z',
                updatedAt: '2025-07-26T16:47:48.825387Z',
            },
            {
                tagId: '019841bb-d503-7dab-8d29-72b91d5a83f9',
                tag: 'みんなだかつがあえうとおもっtrwl',
                isLocked: true,
                createdAt: '2025-07-25T13:18:05.580919Z',
                updatedAt: '2025-07-26T16:47:49.174966Z',
            },
            {
                tagId: '019847a2-1797-7792-843b-240d9711a80b',
                tag: '家のんかなにセミはいてきた！',
                isLocked: true,
                createdAt: '2025-07-26T16:47:41.984019Z',
                updatedAt: '2025-07-26T16:47:54.580777Z',
            },
            {
                tagId: '019948b8-825e-71d4-809f-c9392bf4669b',
                tag: '訴訟部',
                isLocked: true,
                createdAt: '2025-09-14T14:55:15.643419Z',
                updatedAt: '2025-10-01T14:37:59.74903Z',
            },
            {
                tagId: '01996a31-93c4-7c66-b9b6-cea49b03f0a4',
                tag: 'ex25-relationsメンション',
                isLocked: true,
                createdAt: '2025-09-21T02:54:18.061942Z',
                updatedAt: '2025-10-01T14:38:00.495847Z',
            },
            {
                tagId: '0199a02e-48e7-78df-935a-1eed39642804',
                tag: '私は全強！！！',
                isLocked: true,
                createdAt: '2025-10-01T14:30:11.950969Z',
                updatedAt: '2025-10-01T14:38:01.068543Z',
            },
            {
                tagId: '0199dadc-071f-7996-a9e7-5bd500677f7f',
                tag: 'nええまkyさあ',
                isLocked: true,
                createdAt: '2025-10-12T23:57:56.903231Z',
                updatedAt: '2025-10-28T02:35:45.317303Z',
            },
            {
                tagId: '0199e82d-eacb-7179-8c45-72f6c84296e2',
                tag: '寝ぼけて睡魔にDiscordのフレンド申請をおくった',
                isLocked: true,
                createdAt: '2025-10-15T14:02:27.41213Z',
                updatedAt: '2025-10-28T02:35:45.852103Z',
            },
            {
                tagId: '0199e840-cc80-71d0-bb96-2f9a80965d30',
                tag: 'ぴえぇぇぇぇ',
                isLocked: true,
                createdAt: '2025-10-15T14:23:04.839727Z',
                updatedAt: '2025-10-28T02:35:46.313694Z',
            },
            {
                tagId: '0199f7fd-d62d-71d6-8054-0f5a0c7a7aea',
                tag: '大殿籠れ',
                isLocked: true,
                createdAt: '2025-10-18T15:43:51.862492Z',
                updatedAt: '2025-10-28T02:35:46.777905Z',
            },
            {
                tagId: '019a1bf0-5395-7af9-a053-d092de381a7d',
                tag: '寝かされてる奴',
                isLocked: true,
                createdAt: '2025-10-25T15:15:26.237149Z',
                updatedAt: '2025-10-28T02:35:47.297808Z',
            },
            {
                tagId: '019a1bf2-79a8-7af9-b6df-394a644519a7',
                tag: 'やさこ寝ろ',
                isLocked: true,
                createdAt: '2025-10-25T15:17:47.057128Z',
                updatedAt: '2025-10-28T02:35:47.769693Z',
            },
            {
                tagId: '019a5ee6-350b-7c65-8736-b87a902a0d98',
                tag: '1-もんてょn',
                isLocked: true,
                createdAt: '2025-11-07T15:18:56.532099Z',
                updatedAt: '2025-11-09T22:29:45.726674Z',
            },
            {
                tagId: '019a63c6-4bdd-7532-a489-e58d45ba373b',
                tag: 'テトリスは5マス',
                isLocked: true,
                createdAt: '2025-11-08T14:02:11.302583Z',
                updatedAt: '2025-11-09T22:29:42.841136Z',
            },
            {
                tagId: '019a8b8a-75a2-7c23-a447-cd162c4b3d25',
                tag: 'かお文字キラー',
                isLocked: true,
                createdAt: '2025-11-16T08:04:58.647639Z',
                updatedAt: '2025-11-17T15:22:38.206913Z',
            },
            {
                tagId: '019aa53f-7a3e-7a50-afe7-1ac3b5ee0105',
                tag: '寝ます！！！！！！！！！！！！！！！！！！！！！！！！！！！',
                isLocked: true,
                createdAt: '2025-11-21T07:09:52.072364Z',
                updatedAt: '2025-11-23T22:17:07.976586Z',
            },
            {
                tagId: '019aab6b-2f1b-7adf-a86b-df6f5041ed3d',
                tag: '僕は全強！！！！！！！！！！！！',
                isLocked: true,
                createdAt: '2025-11-22T11:55:19.716114Z',
                updatedAt: '2025-11-23T22:17:08.772687Z',
            },
            {
                tagId: '019aab6d-56f8-7ae8-a5d1-e278dad7acf2',
                tag: 'ふゎぁぁぁ',
                isLocked: true,
                createdAt: '2025-11-22T11:57:40.992601Z',
                updatedAt: '2025-11-23T22:17:13.495075Z',
            },
            {
                tagId: '019ab13b-9014-76b4-a08f-cdd4317a12d0',
                tag: 'HACKATON',
                isLocked: true,
                createdAt: '2025-11-23T15:01:02.110556Z',
                updatedAt: '2025-11-23T22:17:14.677996Z',
            },
            {
                tagId: '019ac5f3-681f-70fd-a646-79615dc4ec41',
                tag: 'まぁ、まったくねむくなくて:oyoo:というかんじだ',
                isLocked: true,
                createdAt: '2025-11-27T15:34:14.823973Z',
                updatedAt: '2026-05-01T00:24:42.904678Z',
            },
            {
                tagId: '0197e310-a2d0-772e-bd40-af21d4aef528',
                tag: 'かやま！',
                isLocked: true,
                createdAt: '2025-12-01T13:48:01.09554Z',
                updatedAt: '2026-05-01T00:24:43.638991Z',
            },
            {
                tagId: '019ada79-8ddb-7025-98ef-ebf83e82060f',
                tag: '量子邪学',
                isLocked: true,
                createdAt: '2025-12-01T15:13:10.629048Z',
                updatedAt: '2026-05-01T00:24:44.171514Z',
            },
            {
                tagId: '019d0680-7703-72da-a970-709746ac389b',
                tag: 'るんる',
                isLocked: true,
                createdAt: '2026-03-19T14:29:35.629151Z',
                updatedAt: '2026-05-01T00:24:45.227758Z',
            },
            {
                tagId: '7e01ac2b-e660-4f69-9066-a3e6e6775a8c',
                tag: '女子中学生',
                isLocked: true,
                createdAt: '2026-03-25T04:28:59.646713Z',
                updatedAt: '2026-05-01T00:24:45.754112Z',
            },
            {
                tagId: '019e270f-364c-720b-9da6-310a1f0b3739',
                tag: ':@mamo:化',
                isLocked: true,
                createdAt: '2026-05-14T15:16:08.918373Z',
                updatedAt: '2026-05-19T16:29:35.450258Z',
            },
            {
                tagId: '019e48bf-3af1-756d-980c-41017dbc6d3f',
                tag: '水よそう',
                isLocked: true,
                createdAt: '2026-05-21T04:15:52.57004Z',
                updatedAt: '2026-05-21T07:57:17.280503Z',
            },
            {
                tagId: '019ee38a-7655-7cd1-a3d7-a2841ba9e26d',
                tag: 'デバッグ用',
                isLocked: true,
                createdAt: '2026-06-20T05:39:22.857554Z',
                updatedAt: '2026-08-16T11:54:45.69545Z',
            },
            {
                tagId: '019f285f-0789-713e-9dff-d054630b2c65',
                tag: 'あげまぢた',
                isLocked: true,
                createdAt: '2026-07-03T14:25:44.348027Z',
                updatedAt: '2026-08-16T11:54:46.420471Z',
            },
            {
                tagId: '019f9ec9-aac1-7ca0-a51a-63390ab4e2c9',
                tag: 'ぴええええ怪人',
                isLocked: true,
                createdAt: '2026-07-26T14:17:24.435266Z',
                updatedAt: '2026-08-16T11:54:47.375031Z',
            },
            {
                tagId: '019f9ece-752f-7ca2-a265-8d0ae26ab5a2',
                tag: 'すでにタグにある文字列ならいくら言ってもあらたにタグにされる',
                isLocked: true,
                createdAt: '2026-07-26T14:22:38.403829Z',
                updatedAt: '2026-08-16T11:54:47.984189Z',
            },
        ],
        groups: [
            '0195479f-947d-7a5f-9ae5-5a7e8f04568d',
            '0196108c-a04a-730e-a411-92446acd21b1',
            '01962f18-488b-7f40-8781-e43d8b795ac1',
            '0196b530-ead6-7590-8964-16be47be1090',
            '0196bb29-4860-7c92-9ada-ce51d821ff1b',
            '01974428-c00b-74fa-bd5f-b8105a320e6a',
            '019753cc-b29c-7d5e-b450-e2ee2c1c7cca',
            '01979bc2-8145-74bd-996b-47d3ef2950d0',
            '0197a9dc-8b1e-741b-8d64-2493275ca006',
            '0197b6fa-f85a-7f92-bef3-3e1ed244ad23',
            '0197f76d-3d51-7c89-a5c4-b14bbaebc729',
            '0197fe05-7967-7816-aef5-763bc1474341',
            '0198449c-9c27-7086-8040-16568c4fadc7',
            '01988f1e-370c-7bbb-be31-23c45a75c869',
            '0198a5ce-93db-7466-81bc-53d0666011ef',
            '0198b31b-05f5-7595-a62f-2e5acd7fc8cd',
            '01994d38-2d44-76a5-947f-5e9fd024e3bb',
            '01996560-cb65-7757-85ee-9896e8e97f67',
            '01998507-85ba-7c14-8d4f-8c60aeb769c5',
            '0199cbea-e9fc-7c6c-979b-fd4b3c153190',
            '0199f033-c029-72c0-8685-2fbe2564aff2',
            '019a3d63-d68a-700d-9a15-818b61b29b84',
            '019a5e48-011a-793a-9874-fa7c7f4ee5f5',
            '019a76c3-5fda-7259-9d85-d9b98a5d1372',
            '019af1e5-d047-7e8c-b8d5-b8667d8dd9f2',
            '019af1ed-5a79-7ea6-a71a-cd2366c66510',
            '019af218-dd3d-7f6c-a34f-c2df794abe50',
            '019b0217-8b8a-7e1c-b7e5-0405670aaa44',
            '019b1353-5591-7c15-a56e-9e7752938d45',
            '019b464d-ece4-7648-bfd4-0751c7910618',
            '019b54db-dbee-7d80-91f9-a1d76995c9dd',
            '019b5ed5-391b-7a3c-995c-ee40cc3c8021',
            '019b8d39-3c6c-70c5-ad3f-e604e1d13ac0',
            '019b97aa-aefe-70de-b5a8-4ce4a99016d2',
            '019b9d7d-0061-7cd4-8885-911b8abb129d',
            '019b9d7d-8fd7-7cd5-9342-c92bcfdafc2b',
            '019c3dbd-9d03-76db-a92c-4626898d8405',
            '019ca8d5-9a1c-7162-bd66-1b136d76b242',
            '019cb721-1706-78a5-9f85-3a0a61aa7945',
            '019cc2cf-20b1-79ec-a114-89c9eaada1e9',
            '019cd1e8-09c5-77bc-8c12-1a9a78a8c951',
            '019cd721-94bb-7df3-b932-c9ca95d96579',
            '019cf6ae-ca43-78ac-a822-7d7c5ee26cb9',
            '019cfb42-1d6f-7eb2-a5df-117b98e4f7d1',
            '019cfb5a-4b95-7f33-bc8d-81cd5285af21',
            '019d2543-4cae-72b4-a09d-c8892cb9aa35',
            '019d4e9b-278e-7bf8-8edb-aa7b3b2ada10',
            '019d7bfc-35d3-714b-bd9b-f00436ea7c3d',
            '019db124-aa8d-7e63-bba6-11ff2257129d',
            '019db4b4-f99a-72d6-835e-509c2f97f1e7',
            '019dc3f4-3483-711f-87ea-c6820e4a69aa',
            '019dcc72-6aee-7c67-8751-d7d03b9e6894',
            '019e208c-1cae-7a6f-9e7c-b7a8cc8611ef',
            '019e5476-7f2d-7fb5-808c-3ca046cedacb',
            '019e7c50-9da5-76ea-9967-f7f1d9b6a256',
            '019edb17-0351-7d7c-a7ad-0845f65c2463',
            '019edf50-c0e5-760a-afe3-7320ed8d8a11',
            '019ee7b3-a50d-72ff-805a-61f940d45609',
            '019f0f14-8fee-7549-83f4-a85b173d7c3e',
            '019f375f-68ec-769b-9ccc-86146e0ab5a3',
            '019f3c2f-29ce-7d1e-9bdb-eb36954dd1cb',
            '019f4af2-7c0f-7154-98ce-f4ef6a1df589',
            '019f4f2a-2131-7877-a6e9-722ed4cbd9c0',
            '019f4f8e-6f60-7b2e-8745-7610fb0c74b7',
            '019f8a28-ec4e-7cb7-a872-eb122c68762e',
            '019fb232-9115-7cc1-8eba-dfe5a20ed58d',
            '019fd621-0e35-74f0-b532-4957c6cb8e50',
            '019fd7b3-800d-7769-a0d1-d189aadd7696',
            '0fdd0de3-0423-4a66-9349-deb5d3553afb',
            '165d073c-bcee-49fc-b0af-5b188f5fc48b',
            '280bf56d-fa22-46bc-8dcc-6367d600d873',
            '34815109-4bbf-4574-aa1b-3056a9f01434',
            '539e9c6e-99a0-4afa-a5e1-692b638bcd8c',
            '55128883-eeb7-45c5-a9b3-9e7840cd6786',
            '7ce52eda-8d0e-4199-ad2a-00d6950421f8',
            '858d37ef-2132-4831-bf77-b46a76ff9e67',
            '867b3529-696f-4bd1-af53-1947eba92e77',
            'af240e80-8526-4f21-925e-b20eded06284',
            'b14a543d-e876-42cc-98d2-cf20a9549edb',
            'c5670065-75d4-4851-bfba-9ff05201fc44',
            'cabd58b1-8bc4-4a1a-9f3d-997ed95aaaae',
            'cb977ab2-85fa-4953-ac4d-809eaef427e6',
            'd5dd6290-a5c2-43eb-9572-1a3c1ebabe10',
            'f86db5ec-dc02-4885-aa0a-732bb229a1b5',
            'feb57dcb-f064-49c1-bccd-20ec6d5db3cb',
        ],
        bio: '25B 工学院\nWebと動画編集とグラフィックと組版をやります\n（動画編集のために？）サウンドもやりたい\n\n---\n**役員**\n- 広報補佐(26年)\n\n**プロジェクト**\n- 25年後期プロジェクト「traPM」元リーダー\n  - プロジェクションマッピングイベント「Campus→Canvas」の運営を行います\n  - 設立者です 26年6月、@Pikaに代表を交代しました\n- 24年前期プロジェクト「traOJudge」 フロントエンド\n\n**チーム**\n- SysAd班プロジェクト\n  - traQ Client\n    - traQ thread 開発チーム\n  - booQ client\n  - booQ server\n  - Portal client\n  - design\n  - infra\n\n**イベント**\n- traPTechBook3 運営・組版・執筆\n\n---\n\n#### ホームチャンネル\n\n🏠 [#times/25/yasako](https://q.trap.jp/channels/times/25/yasako)\n\n\n\n\n\n\n\n\n\n\n**兼サー**\n- 工大祭実行委員会（ネットワーク局 / 謎解き企画担当 / デザイン統括部署）\n  - 主にフロントエンドを開発してます\n  - :Astro::react::ts:を使います',
        homeChannel: '01960f1e-9fdd-7e2b-8c40-b5153e56f053',
    },
]

const CURRENT_USER: UserDetail = MOCK_USERS[0]! // konryu

// ---------- スタンプ（実データ 10個） ----------
const MOCK_STAMPS: Stamp[] = [
    {
        id: '269095e6-c71c-4887-afb0-e42b5e2ac73b',
        name: '👍',
        creatorId: '00000000-0000-0000-0000-000000000000',
        fileId: '019ec511-4b34-771a-b2b0-0f18cd238e4f',
        isUnicode: true,
        createdAt: '2019-02-28T12:20:27Z',
        updatedAt: '2026-06-14T07:38:25.517743Z',
        hasThumbnail: false,
    },
    {
        id: '4e4c3c0b-2a23-439d-98b1-2fa3ef5caf40',
        name: '👀',
        creatorId: '00000000-0000-0000-0000-000000000000',
        fileId: '019ec511-45de-771a-af3d-8303331b0cea',
        isUnicode: true,
        createdAt: '2019-02-28T12:20:26Z',
        updatedAt: '2026-06-14T07:38:24.166303Z',
        hasThumbnail: false,
    },
    {
        id: '4e4ea308-ef33-45ba-af50-ac5233c9aa47',
        name: '💪',
        creatorId: '00000000-0000-0000-0000-000000000000',
        fileId: '019ec512-4e0f-771a-aefc-001614449e67',
        isUnicode: true,
        createdAt: '2019-02-28T12:20:26Z',
        updatedAt: '2026-06-14T07:39:31.828796Z',
        hasThumbnail: false,
    },
    {
        id: '1c891de7-e68c-4aa5-9cce-28f0ca74522c',
        name: 'wakaru',
        creatorId: '2cc1df43-d5d7-42aa-8831-00a4efe48ce4',
        fileId: '33b5a80d-e8b2-493c-8092-c6a6d7552308',
        isUnicode: false,
        createdAt: '2019-02-28T12:20:28Z',
        updatedAt: '2019-02-28T12:20:28Z',
        hasThumbnail: false,
    },
    {
        id: '1ffcf76f-3d46-4386-9daf-ff9c807127c7',
        name: 'god',
        creatorId: '2cc1df43-d5d7-42aa-8831-00a4efe48ce4',
        fileId: '2bd87028-6b84-4876-afdd-b72a3a15a5c0',
        isUnicode: false,
        createdAt: '2019-02-28T12:20:28Z',
        updatedAt: '2019-02-28T12:20:28Z',
        hasThumbnail: false,
    },
    {
        id: 'ca329a82-028c-4180-b66b-92de5a025016',
        name: 'kawaii',
        creatorId: 'fab1c3fd-f7e7-4e67-b6a7-458f21db5445',
        fileId: '0ec6a97d-5674-4777-8166-636e686a2771',
        isUnicode: false,
        createdAt: '2019-05-30T15:42:11.062248Z',
        updatedAt: '2019-05-30T15:42:11.062248Z',
        hasThumbnail: false,
    },
    {
        id: 'f9fa9052-f379-451d-95b9-a8d9db6decde',
        name: 'tensai',
        creatorId: 'fab1c3fd-f7e7-4e67-b6a7-458f21db5445',
        fileId: '0ff23b32-3e60-4d2f-a093-4e5a386fd505',
        isUnicode: false,
        createdAt: '2019-06-09T09:29:39.065827Z',
        updatedAt: '2019-06-09T09:29:39.065827Z',
        hasThumbnail: false,
    },
    {
        id: 'ec8d38c7-eb7e-4886-91c8-a9b08d686769',
        name: 'arigatou',
        creatorId: 'c2258796-72d9-42ed-bd29-5aad1bf4c690',
        fileId: 'e12de704-bf76-4177-820d-0144e8a9d51b',
        isUnicode: false,
        createdAt: '2020-03-31T16:10:50.939227Z',
        updatedAt: '2020-03-31T16:10:50.939227Z',
        hasThumbnail: false,
    },
    {
        id: 'd339c689-453a-472d-89d3-dd37e2790e45',
        name: 'ha',
        creatorId: 'c2258796-72d9-42ed-bd29-5aad1bf4c690',
        fileId: 'a68ea634-2b36-4df8-9600-f81b8e438dfd',
        isUnicode: false,
        createdAt: '2019-02-28T12:20:28Z',
        updatedAt: '2019-02-28T12:20:28Z',
        hasThumbnail: false,
    },
    {
        id: '4a7ac270-0bfa-4b2a-9ebc-58e3487a23da',
        name: 'ultrafastparrot',
        creatorId: '62bbec89-8322-439b-bb3f-b93e802e932d',
        fileId: 'f06052e1-6770-4f5f-b8df-576487429ae3',
        isUnicode: false,
        createdAt: '2019-06-06T14:02:56.282065Z',
        updatedAt: '2019-06-06T14:02:56.282065Z',
        hasThumbnail: false,
    },
]

// ---------- チャンネル（このモックで扱うパスのみ） ----------
const MOCK_CHANNEL_PATHS: Record<string, string> = {
    '04ad2c18-fdcb-4c43-beef-82e8ba26ac98': 'general',
    'f2bea4b7-8a2d-43ba-b84b-f53aea3d43c5': 'random',
    'b70ef91c-8fda-4124-a7e5-4648e18da6c5': 'random/progress',
    '019d671f-67fc-7bb8-9d3c-430b8ae4bbdc': 'times/26/Ayuto1123',
    '019db58b-5bb0-743f-ab67-fd1bc2ab9a25': 'event/1-Monthon/26',
    '019d6345-e078-71c4-9655-8cd5db400f4b': 'univ/26',
    '019f4f20-ff3c-773e-90cf-7641a4c0e60b': 'gps/onair',
}

const MOCK_PUBLIC_CHANNELS: PublicChannel[] = Object.entries(MOCK_CHANNEL_PATHS).map(
    ([id, path]) => ({
        id,
        name: path.split('/').at(-1) ?? path,
        topic: '',
        parentId: null,
        archived: false,
        force: false,
        children: [],
    }),
)

const MOCK_DM_CHANNELS: DMChannel[] = [
    { id: 'dm-001', userId: MOCK_USERS[1]?.id || '' },
    { id: 'dm-002', userId: MOCK_USERS[2]?.id || '' },
]

// ---------- メッセージ（チャンネルに関連した本文） ----------
const channelMessageMap: Record<string, string[]> = {
    '04ad2c18-fdcb-4c43-beef-82e8ba26ac98': [
        '[重要] 今週の全体ミーティングは金曜20時です。',
        '新規メンバー向けのガイドラインを更新しました。確認をお願いします。',
        'サーバーメンテナンスのお知らせ: 8/22 22:00〜23:00',
    ],
    'f2bea4b7-8a2d-43ba-b84b-f53aea3d43c5': [
        '今日のランチ何にしようかな〜',
        '最近ハマってるアニメ、めっちゃおすすめ！',
        '誰かこのバグの原因わかる人いますか？',
        '週末何する？',
    ],
    'b70ef91c-8fda-4124-a7e5-4648e18da6c5': [
        '今日はReactの勉強してた。やっとhooks理解できた気がする！',
        'ポートフォリオサイト、デザインだけ完成した。',
        'AtCoder茶色になった！やったぜ！',
        '今月の目標: 毎日1コミットする 💪',
    ],
    '019db58b-5bb0-743f-ab67-fd1bc2ab9a25': [
        '1-Monthon 26、進捗どうですか？',
        '今日の作業内容: 認証周りを実装しました。',
        '来週の進捗確認会は水曜14時でどうでしょう？',
        '1-Monthon用のリポジトリ作りました！',
    ],
    '019d671f-67fc-7bb8-9d3c-430b8ae4bbdc': [
        '今日も一日頑張るぞー！',
        '誰か遊びませんか？',
        'この時間に起きてる人いる？',
    ],
    '019d6345-e078-71c4-9655-8cd5db400f4b': [
        '単位大丈夫かな…',
        '今週の講義、全部出席するぞ！',
        '期末試験の勉強やばい。助けて。',
    ],
}

const defaultMessages = ['今日もいい天気ですね！', '何か面白いことないかな〜']

const generateMockMessage = (index: number, overrides: Partial<Message> = {}): Message => {
    const author = MOCK_USERS[index % MOCK_USERS.length] ?? CURRENT_USER
    const channels = MOCK_PUBLIC_CHANNELS
    const channel = channels[index % channels.length] ?? MOCK_PUBLIC_CHANNELS[0]!
    const baseDate = new Date('2025-01-01T00:00:00Z')
    const createdAt = stableDate(baseDate, index % 30, (index * 3) % 24, (index * 7) % 60)

    // チャンネルに関連した本文を取得
    const messages = channelMessageMap[channel.id] || defaultMessages
    const content = messages[index % messages.length] || defaultMessages[0]!

    // スタンプ: 0〜3個付与
    const stampCount = index % 4
    const stamps: MessageStamp[] = Array.from({ length: stampCount }, (_, offset) => {
        const stamp = MOCK_STAMPS[(index + offset) % MOCK_STAMPS.length] ?? MOCK_STAMPS[0]!
        return {
            stampId: stamp.id,
            count: ((index + offset + 1) % 9) + 1,
            createdAt,
            updatedAt: createdAt,
            userId: MOCK_USERS[(index + offset + 1) % MOCK_USERS.length]?.id ?? CURRENT_USER.id,
        }
    })

    return {
        id: createUuid(6000 + index),
        channelId: overrides.channelId ?? channel.id,
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

// ★ 複数人が同じスタンプを押しているケースを追加（先頭のメッセージを修正）
const now = new Date().toISOString()
const targetMessage = MESSAGE_POOL[0] // 最初のメッセージ
if (targetMessage) {
    targetMessage.content = '複数人が同じスタンプを押しているケースのテストです。'
    targetMessage.createdAt = now
    targetMessage.updatedAt = now
    targetMessage.stamps = [
        // ユーザーA (konryu) が 👍 を1回
        {
            stampId: MOCK_STAMPS[0]!.id, // 👍
            count: 1,
            userId: MOCK_USERS[0]!.id,
            createdAt: now,
            updatedAt: now,
        },
        // ユーザーB (Ayuto) が 👍 を2回
        {
            stampId: MOCK_STAMPS[0]!.id, // 同じ 👍
            count: 2,
            userId: MOCK_USERS[1]!.id,
            createdAt: now,
            updatedAt: now,
        },
        // ユーザーC (Hokubu) が 👀 を1回
        {
            stampId: MOCK_STAMPS[1]!.id, // 👀
            count: 1,
            userId: MOCK_USERS[2]!.id,
            createdAt: now,
            updatedAt: now,
        },
        // ユーザーA (konryu) が 👀 も押している（同じスタンプを別ユーザーも）
        {
            stampId: MOCK_STAMPS[1]!.id, // 同じ 👀
            count: 3,
            userId: MOCK_USERS[0]!.id,
            createdAt: now,
            updatedAt: now,
        },
    ]
    console.log(targetMessage)
    MESSAGE_POOL[0] = targetMessage
    console.log(MESSAGE_POOL[0])
}
// 2番目のメッセージにも同様のケースを追加（別のスタンプで）
const secondMessage = MESSAGE_POOL[1]!
if (secondMessage) {
    secondMessage.content = '別のスタンプを複数人が押しているケースのテストです。'
    secondMessage.createdAt = now
    secondMessage.updatedAt = now
    secondMessage.stamps = [
        {
            stampId: MOCK_STAMPS[3]!.id, // wakaru
            count: 1,
            userId: MOCK_USERS[0]!.id,
            createdAt: now,
            updatedAt: now,
        },
        {
            stampId: MOCK_STAMPS[3]!.id, // 同じ wakaru
            count: 1,
            userId: MOCK_USERS[1]!.id,
            createdAt: now,
            updatedAt: now,
        },
        {
            stampId: MOCK_STAMPS[3]!.id, // 同じ wakaru（3人目）
            count: 1,
            userId: MOCK_USERS[2]!.id,
            createdAt: now,
            updatedAt: now,
        },
    ]
    MESSAGE_POOL[1] = secondMessage
}

let pendingNewMessages: Message[] = [
    generateMockMessage(101, {
        channelId: 'f2bea4b7-8a2d-43ba-b84b-f53aea3d43c5',
        content: '✨ 新着メッセージその1！',
    }),
    generateMockMessage(102, {
        channelId: 'f2bea4b7-8a2d-43ba-b84b-f53aea3d43c5',
        content: '📢 新着メッセージその2！',
    }),
    generateMockMessage(103, {
        channelId: '019db58b-5bb0-743f-ab67-fd1bc2ab9a25',
        content: '🎉 1-Monthon進捗どうですか？',
    }),
]

const MOCK_ACCESS_TOKEN = 'mock_access_token_' + Date.now()
const MOCK_REFRESH_TOKEN = 'mock_refresh_token_' + Date.now()

// ============================================
// MSW WebSocket モック（新規追加）
// ============================================
// MSW の WebSocket クライアントに必要なメソッドのみを定義
interface WSClient {
    send(data: string): void
    addEventListener(event: string, listener: (event: unknown) => void): void
    removeEventListener(event: string, listener: (event: unknown) => void): void
    readyState?: number
}

let wsClients: WSClient[] = []

const chat = ws.link('ws://localhost:8080/api/ws*')

chat.addEventListener('connection', ({ client }: { client: WSClient }) => {
    console.log('WebSocket 接続確立 (MSW)')
    wsClients.push(client)

    client.addEventListener('close', () => {
        console.log('WebSocket 切断 (MSW)')
        wsClients = wsClients.filter((c) => c !== client)
    })

    client.addEventListener('message', (event: unknown) => {
        // 型ガード: event が { data: string } を持つことを確認
        if (event && typeof event === 'object' && 'data' in event) {
            const data = (event as { data: string }).data
            console.log('WebSocket メッセージ受信:', data)
        }
    })
})

// ============================================
// イベント送信ユーティリティ
// ============================================

const broadcastEvent = (event: { type: string; body: unknown }) => {
    wsClients.forEach((client) => {
        try {
            // readyState が定義されていないか、OPEN (1) の場合は送信
            if (client.readyState === undefined || client.readyState === 1) {
                client.send(JSON.stringify(event))
            }
        } catch (e) {
            console.warn('WebSocket 送信エラー:', e)
        }
    })
}

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
            new URL(request.url).searchParams.get('SortByPopularity') === 'true'

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

        // 新着がある場合
        if (pendingNewMessages.length > 0) {
            const newIds = pendingNewMessages.map((m) => m.id)
            // 新着メッセージを MESSAGE_POOL の先頭に追加（次回以降の /timeline で取得できるように）
            MESSAGE_POOL.unshift(...pendingNewMessages)
            // 新着リストをクリア（一度だけの動作）
            pendingNewMessages = []
            const response: ApiTimelineMessage = { messages: newIds }
            return HttpResponse.json(response)
        }

        // 新着がない場合
        return new HttpResponse(null, { status: 204 })
    }),

    http.get(apiUrl('/api/ws'), () => {
        return HttpResponse.json({ message: 'WebSocket endpoint (handled by real WS)' })
    }),

    http.post(apiUrl('/api/oauth/token'), async ({ request }) => {
        const body = (await request.json()) as { code: string }
        if (!body.code) {
            return new HttpResponse(JSON.stringify({ message: 'code is required' }), {
                status: 400,
            })
        }
        return HttpResponse.json({
            access_token: MOCK_ACCESS_TOKEN,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: MOCK_REFRESH_TOKEN,
        })
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

    http.get('https://q.trap.jp/api/v3/channels/:channelId/path', async ({ params }) => {
        await simulateNetworkDelay(120)
        const channelId = params.channelId as string
        const path = MOCK_CHANNEL_PATHS[channelId]
        if (!path) {
            return new HttpResponse(JSON.stringify({ message: 'チャンネルが見つかりません' }), {
                status: 404,
            })
        }
        return HttpResponse.json({ path })
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

            // チャンネルに関連した本文を取得
            const messages = channelMessageMap[channelId as string] || defaultMessages
            const content = body.content || messages[Math.floor(Math.random() * messages.length)]

            const newMessage = generateMockMessage(200 + MESSAGE_POOL.length, {
                channelId: channelId as string,
                content,
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

    http.post(
        'https://q.trap.jp/api/v3/messages/:messageId/stamps/:stampId',
        async ({ params }) => {
            const { messageId, stampId } = params

            const message = MESSAGE_POOL.find((m) => m.id === messageId)
            if (!message) {
                return new HttpResponse(JSON.stringify({ message: 'メッセージが見つかりません' }), {
                    status: 404,
                })
            }

            const userId = CURRENT_USER.id
            const existingStamp = message.stamps.find(
                (s) => s.stampId === stampId && s.userId === userId,
            )

            if (existingStamp) {
                existingStamp.count += 1
            } else {
                const now = new Date().toISOString()
                message.stamps.push({
                    stampId: stampId as string,
                    count: 1,
                    createdAt: now,
                    updatedAt: now,
                    userId: userId,
                })
            }

            // WebSocket イベントを送信
            broadcastEvent({
                type: 'StampUpdated',
                body: {
                    messageId: messageId,
                    stamps: message.stamps,
                },
            })

            return new HttpResponse(null, { status: 204 })
        },
    ),

    http.delete(
        'https://q.trap.jp/api/v3/messages/:messageId/stamps/:stampId',
        async ({ params }) => {
            await simulateNetworkDelay(150)
            const { messageId, stampId } = params

            const message = MESSAGE_POOL.find((m) => m.id === messageId)
            if (!message) {
                return new HttpResponse(JSON.stringify({ message: 'メッセージが見つかりません' }), {
                    status: 404,
                })
            }

            const userId = CURRENT_USER.id
            const stampIndex = message.stamps.findIndex(
                (s) => s.stampId === stampId && s.userId === userId,
            )

            if (stampIndex === -1) {
                return new HttpResponse(JSON.stringify({ message: 'スタンプが押されていません' }), {
                    status: 400,
                })
            }

            const stamp = message.stamps[stampIndex]!
            if (stamp.count > 1) {
                stamp.count -= 1
                stamp.updatedAt = new Date().toISOString()
            } else {
                message.stamps.splice(stampIndex, 1)
            }

            // WebSocket イベントを送信
            broadcastEvent({
                type: 'StampUpdated',
                body: {
                    messageId: messageId,
                    stamps: message.stamps,
                },
            })

            return new HttpResponse(null, { status: 204 })
        },
    ),
]

export const handlers = [...oneMonthonHandlers, ...traqHandlers]
