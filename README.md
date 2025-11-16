これはClaude Codeに作らせたお遊びのプロジェクトです。

# Gopher Server

Node.jsで実装したGopherプロトコルサーバー

## Gopherプロトコルとは

Gopherは、World Wide Webが普及する以前の1991年にミネソタ大学で開発された、インターネット上でドキュメントを配布・検索・取得するためのプロトコルです。RFC 1436で定義されています。

## 特徴

- **シンプルな実装**: Node.jsの標準ライブラリのみを使用
- **ディレクトリブラウジング**: フォルダ構造を自動的にGopherメニューとして表示
- **複数のファイルタイプ対応**: テキスト、画像、アーカイブなど
- **セキュリティ**: パストラバーサル攻撃を防ぐ安全な実装
- **ログ機能**: すべてのリクエストをタイムスタンプ付きで記録

## インストール

```bash
git clone <repository-url>
cd gopher-server
npm install
```

## 使い方

### サーバーの起動

```bash
npm start
```

デフォルトではポート70で起動します。ポート番号とホスト名は環境変数で変更可能です：

```bash
PORT=7070 HOST=0.0.0.0 node server.js
```

### コンテンツの追加

`gopherdata/` ディレクトリにファイルやフォルダを配置してください：

```
gopherdata/
├── welcome.txt          # テキストファイル
├── about.txt
└── docs/                # サブディレクトリ
    └── tutorial.txt
```

### アクセス方法

#### Gopherクライアントを使用

```bash
# Lynx
lynx gopher://localhost:70

# Bombadillo
bombadillo gopher://localhost:70
```

#### Telnetを使用

```bash
telnet localhost 70
```

接続後、セレクタ（パス）を入力してEnterキーを押します：
- `/` または空白: ルートディレクトリ
- `/welcome.txt`: ファイルを表示
- `/docs`: ディレクトリを表示

#### curlを使用（テスト用）

```bash
# ルートディレクトリ
curl gopher://localhost:70

# 特定のファイル
curl gopher://localhost:70/welcome.txt
```

## ファイルタイプ

サーバーは拡張子に基づいて自動的にGopherアイテムタイプを判定します：

| 拡張子 | Gopherタイプ | 説明 |
|--------|-------------|------|
| .txt | 0 | テキストファイル |
| .gif | g | GIF画像 |
| .jpg, .png | I | 画像ファイル |
| .html, .htm | h | HTMLファイル |
| .zip, .tar, .gz | 5 | アーカイブファイル |
| .bin, .exe | 9 | バイナリファイル |

## Gopherメニューの形式

各行は以下の形式で構成されます：

```
<タイプ><表示名><TAB><セレクタ><TAB><ホスト><TAB><ポート><CR><LF>
```

例：
```
0welcome.txt	/welcome.txt	localhost	70
1docs	/docs	localhost	70
iInformation line	null	null	0
```

## プロジェクト構造

```
gopher-server/
├── server.js           # メインサーバーコード
├── package.json        # npm設定
├── README.md           # このファイル
└── gopherdata/         # Gopherコンテンツのルートディレクトリ
    ├── welcome.txt
    ├── about.txt
    └── docs/
        └── tutorial.txt
```

## 技術仕様

- **プロトコル**: Gopher (RFC 1436)
- **デフォルトポート**: 70
- **Node.jsバージョン**: 14.0.0以上
- **依存関係**: なし（標準ライブラリのみ）

## セキュリティ

- パストラバーサル攻撃（`../`）を防ぐ実装
- `gopherdata/` ディレクトリ外へのアクセスを制限
- すべてのリクエストをログに記録

## 開発

### ログの確認

サーバーは以下の情報をコンソールに出力します：

- クライアント接続/切断
- リクエストされたセレクタ
- ファイル送信/ディレクトリリスティング
- エラー情報

### カスタマイズ

`server.js` の設定部分を編集することで、以下をカスタマイズできます：

- ポート番号
- ホスト名
- ルートディレクトリのパス
- サポートするファイルタイプ

## ライセンス

MIT

## 参考資料

- [RFC 1436 - The Internet Gopher Protocol](https://www.rfc-editor.org/rfc/rfc1436)
- [Gopher (protocol) - Wikipedia](https://en.wikipedia.org/wiki/Gopher_(protocol))
