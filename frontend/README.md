# ドパガキ用traQ frontend

traQ の投稿を TikTok / Instagram Reels のような SNS タイムラインとして表示する Web アプリケーションです。

Vue 3（Composition API）+ TypeScript + Vite を使用します。

## 最初にやること

リポジトリ直下で依存関係をインストールします。

```bash
pnpm --dir frontend install
```

`frontend/` に移動して実行しても構いません。

```bash
cd frontend
pnpm install
```

## 開発

リポジトリ直下で開発サーバーを起動します。

```bash
pnpm --dir frontend run dev
```

起動後は [http://localhost:5173](http://localhost:5173) を開きます。

開発時は API モック（MSW）がデフォルトで有効です。バックエンドへ接続する場合は、`VITE_API_MOCKING=false` を指定してください。

## 本番配信

Docker でビルドすると、Nginx が `dist` を配信します。Vue Router の history mode に対応しているため、`/profile` や `/messages/<messageId>` へ直接アクセスしても `index.html` にフォールバックします。

Vite の環境変数はビルド時に埋め込まれるため、デプロイ先の値を build args で指定してください。

```bash
docker build \
    --build-arg VITE_API_BASE=https://api.example.com \
    --build-arg VITE_API_MOCKING=false \
    --build-arg VITE_TRAQ_CLIENT_ID=<CLIENT_ID> \
    --build-arg VITE_TRAQ_REDIRECT_URI=https://example.com \
    -t 1m26_1-frontend ./frontend
docker run --rm -p 8080:80 1m26_1-frontend
```

## よく触る場所

| パス                       | 役割                                         |
| -------------------------- | -------------------------------------------- |
| `src/App.vue`              | アプリ全体の外枠                             |
| `src/router.ts`            | URL と画面の対応                             |
| `src/views/`               | ページ単位の画面                             |
| `src/components/timeline/` | タイムライン・投稿表示に関するコンポーネント |
| `src/components/common/`   | 汎用コンポーネント                           |
| `src/components/layout/`   | ヘッダー・フッターなどのレイアウト           |
| `src/lib/api/`             | 1m26_1 API と traQ API のクライアント        |
| `src/lib/websocket.ts`     | WebSocket 接続の管理                         |
| `src/stores/`              | Pinia の状態管理                             |
| `src/mocks/`               | 開発用 API モック（MSW）                     |
| `src/gen/api-types.ts`     | OpenAPI から生成した型。編集禁止             |

## APIを呼ぶ

OpenAPI 仕様から TypeScript の型を生成します。リポジトリ直下の `openapi.yaml` を入力にします。

```bash
pnpm --dir frontend run codegen
```

`frontend/` 内から実行する場合は次のとおりです。

```bash
pnpm run codegen
```

生成先は `src/gen/api-types.ts` です。このファイルは自動生成ファイルのため、手で編集しません。API の変更時は OpenAPI 仕様を更新してから codegen を実行してください。

## 変更後の確認

`frontend/` 内で、変更に応じて次を実行します。

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run build
```

リポジトリ直下からは `pnpm --dir frontend run <script>` の形で実行できます。

## 環境変数

環境変数はすべて `VITE_` プレフィックスを使います。`.env.example` を参考に、必要に応じて `.env.local` を作成してください。

| 変数                  | デフォルト              | 用途                                                      |
| --------------------- | ----------------------- | --------------------------------------------------------- |
| `VITE_API_BASE`       | `http://localhost:8080` | 1m26_1 バックエンドのベース URL                           |
| `VITE_API_MOCKING`    | `true`                  | `true` のとき MSW を有効化。バックエンド接続時は `false`  |
| `VITE_TRAQ_CLIENT_ID` | （なし）                | traQ の OAuth クライアント ID。未設定だとログイン時に例外 |

一時的に指定する例です。

```bash
VITE_API_BASE=http://localhost:8080 VITE_API_MOCKING=false pnpm --dir frontend dev
```

## traQ ログインをローカルで動かす

1. `frontend/.env` に `VITE_TRAQ_CLIENT_ID` を設定し、`VITE_API_MOCKING=false` にします。
1. `backend/.env`（`backend/.env.example` を参照）に `TRAQ_CLIENT_ID` を設定します。
   confidential クライアントの場合は `TRAQ_CLIENT_SECRET` も設定してください。
1. `mise run backend` と `mise run frontend` を起動して <http://localhost:5173> を開きます。

認可コードの交換はバックエンドの `POST /api/oauth/token` が行います。PKCE（S256）を使うため、
フロントエンドが `code_verifier` を生成してバックエンドへ渡します。

## フォルダ構成

最初のものなのでviewとかcomponentなどの中身は変わりうる

```csharp
frontend/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
├── eslint.config.ts
├── .prettierrc.json（導入時）
├── .env.example
├── openapi-ts.config.ts（codegen設定）
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── components/
│   │   ├── common/
│   │   ├── timeline/
│   │   │   ├── TimelineContainer.vue
│   │   │   ├── MessageItem.vue
│   │   │   ├── MessageHeader.vue
│   │   │   ├── MessageBody.vue
│   │   │   ├── AttachmentList.vue
│   │   │   ├── StampList.vue
│   │   │   └── NewMessageBanner.vue
│   │   └── layout/
│   │       ├── AppHeader.vue
│   │       └── AppFooter.vue
│   ├── views/
│   │   ├── TimelineView.vue
│   │   └── BookmarkView.vue
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts       # axios インスタンス（共通設定）
│   │   │   ├── endpoints.ts    # 1m26_1 API エンドポイント定義
│   │   │   └── traq.ts         # traQ API クライアント
│   │   ├── websocket.ts        # WebSocket 接続管理
│   │   ├── dateFormatter.ts
│   │   └── textTruncator.ts
│   ├── stores/
│   │   ├── timelineStore.ts
│   │   ├── userStore.ts
│   │   └── stampStore.ts
│   ├── gen/
│   │   └── api-types.ts        # OpenAPI 生成コード（編集禁止）
│   ├── mocks/
│   │   ├── browser.ts
│   │   └── handlers.ts
│   ├── types/
│   │   └── message.ts
│   ├── styles/
│   │   └── main.css
│   └── assets/
│       └── logo.svg
└── public/
    └── favicon.ico
```

`components/` は UI、`views/` はルートに対応する画面、`lib/` は API・WebSocket・表示用ユーティリティ、`stores/` は共有状態を置く場所です。`gen/` はコード生成物、`mocks/` は MSW の定義、`types/` はアプリ固有の型、`styles/` と `assets/` は共通スタイルと静的素材を管理します。

## 参考リンク

- [Vue 3](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [axios](https://axios-http.com/)
- [MSW](https://mswjs.io/)
- [openapi-typescript](https://openapi-ts.dev/)
