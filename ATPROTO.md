
Find something...
⌘K
SDKs
Blog
GitHub

日本語

Home
Introduction
SDKs
Glossary
FAQ
Building apps
Quick start
Guides
Overview
Identity
Data Repositories
Schemas & Lexicon
PDS Self-Hosting
Specs
AT Protocol
Data Model
Lexicon
Cryptography
Accounts
Repository
Blobs
Labels
HTTP API (XRPC)
OAuth
Event Stream
Sync
DID
Handle
NSID
TID
Record Key
URI Scheme
AT プロトコルでアプリケーションを構築するためのクイック スタート ガイド
サンプル アプリケーションのソース コードは GitHub で見つかります。

このガイドでは、現在の「ステータス」を絵文字として公開するシンプルなマルチユーザー アプリを構築します。アプリケーションは次のようになります:

サンプル アプリケーションのスクリーンショット
次の方法について説明します:

OAuth 経由でサインイン
ユーザーに関する情報 (プロファイル) を取得する
ネットワーク ファイアホースで新しいデータをリッスンする
カスタム スキーマを使用してユーザーのアカウントにデータを公開する
ATProto をすぐに理解できるように、ここでは簡単な内容に留めます。各ステップについて、詳細情報へのリンクがあります。

はじめに
Atmosphere のデータは、ユーザーの個人リポジトリに保存されます。各ユーザーが独自の Web サイトを持っているようなものです。目標は、ユーザーからのデータを SQLite DB に集約することです。

私たちのアプリを Google のようなものだと考えてください。Google の仕事が、各 Web サイトの /status.json の下にどの絵文字があるかを伝えることだったとしたら、次のような表示になります。

https://nytimes.com/status.json によると、nytimes.com は 📰 気分です
https://bsky.app/status.json によると、bsky.app は 🦋 気分です
https://reddit.com/status.json によると、reddit.com は 🤓 気分です
Atmosphere も同様に動作しますが、https:// ではなく at:// をチェックします。各ユーザーには at:// URL の下にデータ リポジトリがあります。Atmosphere 内のすべてのユーザー データ リポジトリをクロールして、すべての "status.json" レコードを取得し、それらを SQLite データベースに集約します。

at:// は AT プロトコルの URL スキームです。内部的には HTTP や DNS などの一般的な技術を使用していますが、このチュートリアルで使用するすべての機能が追加されています。

ステップ 1. ExpressJS アプリから始める
まず、リポジトリをクローンしてパッケージをインストールします。

git clone https://github.com/bluesky-social/statusphere-example-app.git
cd statusphere-example-app
cp .env.template .env
npm install
npm run dev
# http://localhost:8080 に移動します

Copy
Copied!
リポジトリは通常の Web アプリです。1999 年のように HTML サーバー側をレンダリングしています。また、Kysely で管理している SQLite データベースもあります。

開始スタック:

Typescript
NodeJS Web サーバー (express)
SQLite データベース (Kysely)
サーバー側レンダリング (uhtml)
各ステップで、Web アプリが Atmosphere を活用する方法を説明します。詳細なコードについては、コードベースを参照してください。繰り返しますが、このチュートリアルでは、わかりやすく簡潔に説明します。

ステップ 2. OAuth でサインイン
誰かがアプリにログインすると、その人の個人用 at:// リポジトリへの読み取りおよび書き込みアクセス権が付与されます。これを使用して、ステータス json レコードを書き込みます。

これを OAuth (spec) を使用して実現します。 OAuth フローのほとんどは、@atproto/oauth-client-node ライブラリを使用して処理されます。これが私たちが目指している構成です:

OAuth 要素の図
ユーザーがログインすると、OAuth クライアントはリポジトリ サーバーとの新しいセッションを作成し、基本的なユーザー情報とともに読み取り/書き込みアクセスを付与します。

ログイン UI のスクリーンショット
ログイン ページでは、ユーザーに「ハンドル」を尋ねるだけです。これは、アカウントに関連付けられたドメイン名です。Bluesky ユーザーの場合、これらは alice.bsky.social のように見えますが、任意の種類のドメイン (例 alice.com) にすることができます。

<!-- src/pages/login.ts -->
<form action="/login" method="post" class="login-form">
  <input
  type="text"
  name="handle"
  placeholder="ハンドルを入力してください (例 alice.bsky.social)"
  required
  />
  <button type="submit">ログイン</button>
</form>

Copy
Copied!
ユーザーがフォームを送信すると、OAuth クライアントに認証フローを開始するように指示し、ユーザーをサーバーにリダイレクトしてプロセスを完了します。

/** src/routes.ts **/
// ログイン ハンドラー
router.post(
  '/login',
  handler(async (req, res) => {
    // OAuth フローを開始します
    const handle = req.body?.handle
    const url = await oauthClient.authorize(handle, {
      scope: 'atproto transition:generic',
    })
    return res.redirect(url.toString())
  })
)

Copy
Copied!
これは、Google や GitHub が使用するのと同じ種類の SSO フローです。ユーザーはパスワードを求められ、次にアプリケーションとのセッションを確認するように求められます。

それが完了すると、ユーザーは Web アプリの /oauth/callback に送り返されます。 OAuth クライアントはユーザーのサーバーのアクセス トークンを保存し、その後、アカウントの DID を Cookie セッションに添付します。

/** src/routes.ts **/
// セッション作成を完了するための OAuth コールバック
router.get(
  '/oauth/callback',
  handler(async (req, res) => {
    // 資格情報を保存します
    const { session } = await oauthClient.callback(params)

    // アカウント DID を Cookie 経由でユーザーに添付します
    const cookieSession = await getIronSession(req, res)
    cookieSession.did = session.did
    await cookieSession.save()

    // アプリに送り返します
    return res.redirect('/')
  })
)

Copy
Copied!
これで準備完了です!これで、ユーザーのリポジトリ サーバーとのセッションが確立され、それを使用してユーザーのデータにアクセスできます。

ステップ 3. ユーザーのプロファイルを取得する
ユーザーについて何か調べてみましょう。Bluesky では、ユーザーは次のような「プロファイル」レコードを公開します。

interface ProfileRecord {
  displayName?: string // 人間にわかりやすい名前
  description?: string // 短い略歴
  avatar?: BlobRef // 小さなプロファイル画像
  Banner?: BlobRef // プロファイルに表示するバナー画像
  createdAt?: string // このプロファイル データが追加された宣言時刻
// ...
}

Copy
Copied!
atproto-browser.vercel.app を使用して、このレコードを直接調べることができます。たとえば、これは @bsky.app のプロファイル レコードです。

このレコードを取得するには、ユーザーの OAuth セッションに関連付けられた エージェント を使用します。

await agent.com.atproto.repo.getRecord({
  repo: agent.assertDid, // ユーザー
  collection: 'app.bsky.actor.profile', // コレクション
  rkey: 'self', // レコード キー
})

Copy
Copied!
レコードを要求するときは、3 つの情報を提供します。

repo ユーザーを識別する DID、
collection コレクション名、および
rkey レコード キー
コレクション名については後ほど説明します。レコード キーは、いくつかの制限 といくつかの一般的なパターンを含む文字列です。"self" パターンは、コレクションにユーザーを説明するレコードが 1 つだけ含まれていると予想される場合に使用されます。

このプロフィール レコードを取得するためにホームページを更新しましょう:

/** src/routes.ts **/
// ホームページ
router.get(
  '/',
  handler(async (req, res) => {
    // ユーザーがサインインしている場合は、サーバーと通信するエージェントを取得します
    const agent = await getSessionAgent(req, res, ctx)

    if (!agent) {
      // ログアウトしたビューを提供します
      return res.type('html').send(page(home()))
    }

    // ログインしたユーザーに関する追加情報を取得します
    const { data: profileRecord } = await agent.com.atproto.repo.getRecord({
      repo: agent.assertDid, // ユーザーのリポジトリ
      collection: 'app.bsky.actor.profile', // bluesky プロフィール レコード タイプ
      rkey: 'self', // レコードのキー
    })

    // ログインしたビューを提供する
    res
      .type('html')
      .send(page(home({ profile: profileRecord.value || {} })))
  })
)

Copy
Copied!
このデータを使用して、ユーザー向けにパーソナライズされた素敵なウェルカム バナーを表示できます:

バナー画像のスクリーンショット
<!-- pages/home.ts -->
<div class="card">
  ${profile
    ? html`<form action="/logout" method="post" class="session-form">
      <div>
        こんにちは、<strong>${profile.displayName || 'friend'}</strong>。
        今日のステータスは?
      </div>
      <div>
        <button type="submit">ログアウト</button>
      </div>
    </form>`
    : html`<div class="session-form">
      <div><a href="/login">ログイン</a>してステータスを設定してください!</div>
      <div>
        <a href="/login" class="button">ログイン</a>
      </div>
    </div>`}
</div>

Copy
Copied!
ステップ 4. レコードの読み取りと書き込み
ユーザー リポジトリは、JSON レコードのコレクションと考えることができます:

リポジトリの図
「プロファイル」レコードの読み取り方法をもう一度見てみましょう:

await agent.com.atproto.repo.getRecord({
  repo: agent.assertDid, // ユーザー
  collection: 'app.bsky.actor.profile', // コレクション
  rkey: 'self', // レコードkey
})

Copy
Copied!
同様の API を使用してレコードを書き込みます。目標は「ステータス」レコードを書き込むことなので、その方法を見てみましょう:

// レコードの時間ベースのキーを生成します
const rkey = TID.nextStr()

// 書き込み
await agent.com.atproto.repo.putRecord({
  repo: agent.assertDid, // ユーザー
  collection: 'xyz.statusphere.status', // コレクション
  rkey, // レコード キー
  record: { // レコード値
    status: "👍",
    createdAt: new Date().toISOString()
  }
})

Copy
Copied!
POST /status ルートでは、この API を使用してユーザーのステータスをリポジトリに公開します。

/** src/routes.ts **/
// "Set status" ハンドラー
router.post(
  '/status',
  handler(async (req, res) => {
    // ユーザーがサインインしている場合は、サーバーと通信するエージェントを取得します
    const agent = await getSessionAgent(req, res, ctx)
    if (!agent) {
      return res.status(401).type('html').send('<h1>Error: Session required</h1>')
    }

    // ステータス レコードを構築します
    const record = {
      $type: 'xyz.statusphere.status',
      status: req.body?.status,
      createdAt: new Date().toISOString(),
    }

    try {
      // ステータス レコードをユーザーのリポジトリに書き込みます
      await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: 'xyz.statusphere.status',
      rkey: TID.nextStr(),
      record,
      })
    } catch (err) {
      logger.warn({ err }, 'レコードの書き込みに失敗しました')
      return res.status(500).type('html').send('<h1>エラー: レコードの書き込みに失敗しました</h1>')
    }

    res.status(200).json({})
  })
)

Copy
Copied!
これで、ホームページにステータス ボタンを一覧表示できます:

<!-- src/pages/home.ts -->
<form action="/status" method="post" class="status-options">
  ${STATUS_OPTIONS.map(status => html`
    <button class="status-option" name="status" value="${status}">
      ${status}
    </button>
  `)}
</form>

Copy
Copied!
これで完了です!

アプリのステータス オプションのスクリーンショット
ステップ 5. カスタムの「ステータス」スキーマの作成
リポジトリ コレクションは型指定されており、スキーマが定義されています。app.bsky.actor.profile 型定義は こちら にあります。

JSON-Schema に非常によく似た Lexicon 言語を使用して、誰でも新しいスキーマを作成できます。スキーマは、所有権を示す 逆 DNS ID を使用します。このデモ アプリでは、このプロジェクト専用に登録した xyz.statusphere (別名 statusphere.xyz) を使用します。

スキーマを作成する理由
スキーマは、アプリが作成するデータを他のアプリケーションが理解するのに役立ちます。スキーマを公開することで、他のアプリケーション作成者がアプリが認識して処理できる形式でデータを公開しやすくなります。

コードベースの /lexicons フォルダーにスキーマを作成しましょう。スキーマの定義方法の詳細については、こちら をご覧ください。

/** lexicons/status.json **/
{
  "lexicon": 1,
  "id": "xyz.statusphere.status",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["status", "createdAt"],
        "properties": {
          "status": {
            "type": "string",
            "minLength": 1,
            "maxGraphemes": 1,
            "maxLength": 32
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}

Copy
Copied!
では、スキーマを使用してコード生成を実行してみましょう:

./node_modules/.bin/lex gen-server ./src/lexicon ./lexicons/*

Copy
Copied!
これにより、アプリで使用できる Typescript インターフェースとランタイム検証関数が生成されます。生成されたコードは次のようになります:

/** src/lexicon/types/xyz/statusphere/status.ts **/
export interface Record {
  status: string
  createdAt: string
  [k: string]: unknown
}

export function isRecord(v: unknown): v is Record {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    (v.$type === 'xyz.statusphere.status#main' || v.$type === 'xyz.statusphere.status')
  )
}

export function validateRecord(v: unknown): ValidationResult {
  return lexicons.validate('xyz.statusphere.status#main', v)
}

Copy
Copied!
このコードを使用して、POST /status ルートを改善してみましょう:

/** src/routes.ts **/
import * as Status from '#/lexicon/types/xyz/statusphere/status'
// ...
// "Set status" ハンドラー
router.post(
  '/status',
  handler(async (req, res) => {
    // ...

    // ステータス レコードを構築して検証
    const record = {
      $type: 'xyz.statusphere.status',
      status: req.body?.status,
      createdAt: new Date().toISOString(),
    }
    if (!Status.validateRecord(record).success) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // ...
  })
)

Copy
Copied!
ステップ 6. ファイアホースをリッスン
ここまでで、次の操作を実行しました。

OAuth 経由でログイン
カスタム スキーマを作成
ログインしたユーザーのレコードの読み取りと書き込み
次に、他のユーザーからステータス レコードを取得します。

私たちのアプリを、リポジトリをクロールしてレコードを取得する Google のようなものだと言ったことを覚えていますか? AT プロトコルの利点の 1 つは、各リポジトリが更新のイベント ログを公開することです。

イベント ストリームの図
リレー サービス を使用すると、ネットワーク内のすべてのユーザーにわたるこれらのイベントの集約されたファイアホースをリッスンできます。この場合、探しているのは有効な xyz.statusphere.status レコードです。

/** src/ingester.ts **/
import { Firehose } from '@atproto/sync'
import * as Status from '#/lexicon/types/xyz/statusphere/status'
// ...

new Firehose({
  filterCollections: ['xyz.statusphere.status'],
  handleEvent: async (evt) => {
    // 書き込みイベントを監視する
    if (evt.event === 'create' || evt.event === 'update') {
    const record = evt.record

    // 書き込みが有効なステータス更新である場合
    if (
      evt.collection === 'xyz.statusphere.status' &&
      Status.isRecord(record) &&
      Status.validateRecord(record).success
    ) {
      // ステータスを保存する
      // TODO
      }
    }
  },
})

Copy
Copied!
これらのステータスを保存するための SQLite テーブルを作成しましょう:

/** src/db.ts **/
// ステータス テーブルを作成します
await db.schema
  .createTable('status')
  .addColumn('uri', 'varchar', (col) => col.primaryKey())
  .addColumn('authorDid', 'varchar', (col) => col.notNull())
  .addColumn('status', 'varchar', (col) => col.notNull())
  .addColumn('createdAt', 'varchar', (col) => col.notNull())
  .addColumn('indexedAt', 'varchar', (col) => col.notNull())
  .execute()

Copy
Copied!
これで、ファイアホースから到着したステータスをデータベースに書き込むことができます:

/** src/ingester.ts **/
// 書き込みが有効なステータス更新である場合
if (
  evt.collection === 'xyz.statusphere.status' &&
  Status.isRecord(record) &&
  Status.validateRecord(record).success
) {
  // ステータスを SQLite に保存します
  await db
    .insertInto('status')
    .values({
    uri: evt.uri.toString(),
    authorDid: evt.author,
    status: record.status,
    createdAt: record.createdAt,
    indexedAt: new Date().toISOString(),
    })
    .onConflict((oc) =>
      oc.column('uri').doUpdateSet({
        status: record.status,
        indexedAt: new Date().toISOString(),
      })
    )
    .execute()
}

Copy
Copied!
ほぼ、情報がループで流れていると考えることができます。

情報の流れの図
アプリケーションはリポジトリに書き込みます。書き込みイベントはその後、ファイアホースに発行され、アプリによってキャッチされてデータベースに取り込まれます。

このようにイベント ログから同期する理由は、ネットワーク内に、関心のあるレコードを書き込む他のアプリがあるためです。イベント ログをサブスクライブすることで、他のアプリによって公開されたデータを含む、関心のあるすべてのデータをキャッチできます。

ステップ 7. 最新のステータスを一覧表示する
SQLite にステータスが取り込まれたので、ユーザーによるステータス更新のタイムラインを作成できます。また、DID からハンドルへのリゾルバも使用して、ステータスとともに適切なユーザー名を表示できるようにします:

/** src/routes.ts **/
// ホームページ
router.get(
  '/',
  handler(async (req, res) => {
    // ...

    // SQLite に保存されているデータを取得します
    const statuses = await db
      .selectFrom('status')
      .selectAll()
      .orderBy('indexedAt', 'desc')
      .limit(10)
      .execute()

    // ユーザーの DID をドメイン名のハンドルにマップします
    const didHandleMap = awaitresolver.resolveDidsToHandles(
      statuses.map((s) => s.authorDid)
    )

    // ...
  })
)

Copy
Copied!
HTML で次のステータス レコードを一覧表示できるようになりました:

<!-- src/pages/home.ts -->
${statuses.map((status, i) => {
  const handle = didHandleMap[status.authorDid] || status.authorDid
  return html`
    <div class="status-line">
      <div>
        <div class="status">${status.status}</div>
      </div>
      <div class="desc">
        <a class="author" href="https://bsky.app/profile/${handle}">@${handle}</a>
        は ${status.indexedAt} で ${status.status} を感じていました。
      </div>
    </div>
  `
})}

Copy
Copied!
アプリ ステータス タイムラインのスクリーンショット
ステップ 8. 楽観的更新
最後の最適化として、「楽観的更新」を導入しましょう。

リポジトリ書き込みとイベント ログによる情報フロー ループを覚えていますか?

情報の流れの図
ユーザーのリポジトリをローカルで更新しているので、そのフローを独自のデータベースに短絡できます。

楽観的更新を示す図
これは、ユーザーがアプリの使用中に自分の変更を確認できるようにするため、重要な最適化です。最終的にイベントがファイアホースから到着すると、すでにローカルに保存されているため、それを破棄します。

これを行うには、SQLite DB への追加の書き込みを含めるように POST /status を更新するだけです:

/** src/routes.ts **/
// "Set status" ハンドラー
router.post(
  '/status',
  handler(async (req, res) => {
    // ...

    let uri
    try {
    // ステータス レコードをユーザーのリポジトリに書き込みます
    const res = await agent.com.atproto.repo.putRecord({
      repo: agent.assertDid,
      collection: 'xyz.statusphere.status',
      rkey: TID.nextStr(),
      record,
    })
    uri = res.uri
    } catch (err) {
      logger.warn({ err }, 'レコードの書き込みに失敗しました')
      return res.status(500).json({ error: 'レコードの書き込みに失敗しました' })
    }

    try {
      // SQLite を楽観的に更新します <-- ここ!
      await db
        .insertInto('status')
        .values({
        uri,
          authorDid: agent.assertDid,
          status: record.status,
          createdAt: record.createdAt,
          indexedAt: new Date().toISOString(),
        })
      .execute()
    } catch (err) {
      logger.warn(
        { err },
        '計算されたビューの更新に失敗しました。firehose によってキャッチされるはずなので無視します'
      )
    }

    res.status(200).json({})
  })
)

Copy
Copied!
このコードは、ingester.ts で行っていることとほとんど同じであることがわかります。

AT Proto で考える
このチュートリアルでは、atproto アプリを構築するための重要な手順について説明しました。データは、ユーザーの at:// リポジトリに正規の形式で公開され、その後、アプリのデータベースに集約されてネットワークのビューが生成されます。

アプリを構築するときは、次の 4 つの重要な手順について考えます。

Atmosphere に公開するレコードの Lexicon スキーマを設計します。

レコードを便利なビューに集約するためのデータベースを作成します。

ユーザーのリポジトリにレコードを書き込むアプリケーションを構築します。

ネットワーク全体のデータを集約するために、firehose をリッスンします。

この情報の流れを常に覚えておいてください。

情報の流れの図
Bluesky ソーシャル アプリ を含む、Atmosphere のすべてのアプリはこのように動作します。

次のステップ
学習した内容を実践したい場合は、次の追加の課題に挑戦してみてください:

すべてのユーザーのプロフィール レコードを同期して、ハンドルではなく表示名を表示できるようにします。
使用された各ステータスの数をカウントし、合計数を表示します。
認証されたユーザーの app.bsky.graph.follow フォローを取得し、それらのステータスを表示します。
Web サイトへのリンクを投稿して 1 から 4 つ星で評価する方法など、別の種類のスキーマを作成します。
さらに学習する準備はできましたか?
仕様、ガイド、SDK はここにあります。
© Copyright 2025. All rights reserved.

Follow us on Bluesky
Follow us on GitHub
Quick start guide to building applications on AT Protocol - AT Protocol