# MAV

FastAPI + React + MySQLを使用したコンテンツ管理システムです。

## 機能

### 基本機能
- **認証・認可**: JWT認証、管理者権限管理
- **コンテンツ管理**: 記事の作成・編集・削除（論理削除）
- **カテゴリ管理**: 多対多関係でのカテゴリ分類
- **プロファイル管理**: ユーザー名・メール・パスワード変更
- **公開ページ**: カテゴリフィルタ付きコンテンツ一覧

### 画像管理機能
- **ファイルアップロード**: 画像ファイルのアップロード（JPEG、PNG、GIF、WebP対応）
- **ファイル管理**: アップロードしたファイルの一覧・プレビュー・削除
- **サムネイル表示**: コンテンツ一覧で自動サムネイル表示
- **Markdown統合**: 画像アップロード時の自動Markdown挿入
- **日本語ファイル名**: 日本語ファイル名の適切な処理
- **リンク切れ検出**: 削除された画像ファイルの検出と適切な表示

## 技術スタック

- **バックエンド**: FastAPI + Uvicorn
- **データベース**: MySQL 8.0
- **ORM**: SQLAlchemy
- **フロントエンド**: React + Vite
- **認証**: JWT (JSON Web Token)
- **開発環境**: Docker + Docker Compose

## プロジェクト構成

```
mav/
├── backend/                        # FastAPI アプリケーション
│   ├── app.py                     # FastAPIメインアプリ
│   ├── infrastructure/            # インフラストラクチャ層
│   │   └── persistence/          # データベース関連
│   │       ├── database.py       # DB接続設定
│   │       └── models.py         # SQLAlchemyモデル
│   ├── presentation/             # プレゼンテーション層
│   │   ├── api/                  # APIルーター
│   │   │   ├── auth_router.py    # 認証API
│   │   │   ├── content_router.py # コンテンツAPI
│   │   │   ├── category_router.py# カテゴリAPI
│   │   │   └── upload_router.py  # ファイルアップロードAPI
│   │   └── schemas/              # リクエスト/レスポンススキーマ
│   │       ├── auth_schemas.py   # 認証スキーマ
│   │       ├── content_schemas.py# コンテンツスキーマ
│   │       └── category_schemas.py# カテゴリスキーマ
│   ├── alembic/                  # データベースマイグレーション
│   ├── requirements.txt          # Python依存関係
│   └── Dockerfile               # バックエンド用Docker設定
├── frontend/                     # React アプリケーション
│   ├── src/
│   │   ├── App.jsx              # メインコンポーネント
│   │   ├── App.css              # スタイル
│   │   └── main.jsx             # エントリーポイント
│   ├── package.json             # Node.js依存関係
│   ├── vite.config.js           # Vite設定
│   ├── Dockerfile              # フロントエンド用Docker設定
│   └── index.html              # HTMLテンプレート
├── uploads/                   # アップロードファイル保存先
├── docker-compose.yml          # 開発環境用Docker構成
└── README.md                   # プロジェクト説明
```

## クイックスタート

### 1. 環境設定

まず、環境変数を設定します：

```bash
# .env.exampleを.envにコピー
cp .env.example .env
```

`.env`ファイルを編集して、実際の環境に合わせて設定を変更してください：

```bash
# バックエンド設定
BACKEND_PORT=8000
DEBUG=true
JWT_SECRET_KEY=change-this-to-a-secure-secret-key

# データベース設定
MYSQL_ROOT_PASSWORD=change-this-password
MYSQL_USER=mav_user
MYSQL_PASSWORD=change-this-password
MYSQL_DATABASE=mav_db

# フロントエンド設定
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:8000
```

注意：
- `JWT_SECRET_KEY`、`MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD`は実際の環境に合わせて変更してください
- `VITE_API_URL`は実際のサーバーIPアドレスに合わせて変更してください

### 2. 環境構築

```bash
# Docker Composeで全サービスを起動
sudo docker compose up --build -d

# データベースマイグレーションを実行
sudo docker compose run --rm migrate
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API仕様書**: http://localhost:8000/docs

### 4. 初期セットアップ

初回アクセス時、管理者アカウントのセットアップ画面が表示されます。
画面の指示に従って管理者アカウントを作成してください。

セットアップ完了後、自動的に管理画面にログインされます。

## 初期セットアップのテスト方法

初期セットアップ機能をテストする場合は、以下の手順で行ってください：

### 1. データベースをクリアして初期状態にする

```bash
# 現在のコンテナを停止・削除（データベースも削除）
sudo docker compose down -v

# 新しい環境で起動
sudo docker compose up --build -d

# データベースマイグレーションを実行
sudo docker compose run --rm migrate
```

### 2. ブラウザでアクセス

```
http://localhost:3000
```

初回アクセス時、初期セットアップ画面が表示されます。

### 3. 管理者アカウントを作成

表示されたフォームに必要な情報を入力して「セットアップ完了」ボタンをクリックすると、自動的に管理画面にログインされます。

### 4. セットアップ後の確認

- 管理画面が表示されることを確認
- ログアウト後、通常のログイン画面からアクセス可能であることを確認
- 作成したアカウントでログインできることを確認

## 主要API

### 認証

- `GET /auth/setup-status` - 初期セットアップ状態確認
- `POST /auth/initial-setup` - 初期管理者作成
- `POST /auth/login` - ログイン
- `GET /auth/me` - ユーザー情報取得
- `PUT /auth/profile` - プロファイル更新
- `PUT /auth/password` - パスワード変更

### コンテンツ管理（管理者のみ）

- `POST /contents/` - コンテンツ作成
- `PUT /contents/{id}` - コンテンツ更新
- `DELETE /contents/{id}` - コンテンツ削除
- `GET /contents/admin` - 管理者用コンテンツ一覧

### 公開API

- `GET /contents/` - 公開コンテンツ一覧
- `GET /contents/{id}` - 個別コンテンツ取得
- `GET /categories/` - カテゴリ一覧

### カテゴリ管理（管理者のみ）

- `POST /categories/` - カテゴリ作成
- `PUT /categories/{id}` - カテゴリ更新
- `DELETE /categories/{id}` - カテゴリ削除

### ファイル管理（管理者のみ）

- `POST /uploads/upload` - ファイルアップロード
- `GET /uploads/` - ファイル一覧取得
- `GET /uploads/{filename}` - ファイル取得
- `DELETE /uploads/{filename}` - ファイル削除

## 開発コマンド

### Docker Compose操作

```bash
# サービス起動
sudo docker compose up -d

# ログ確認
sudo docker compose logs backend
sudo docker compose logs frontend

# サービス再起動
sudo docker compose restart backend

# 停止・削除
sudo docker compose down

# 完全クリーンアップ（データベース含む）
sudo docker compose down -v
```

### データベースマイグレーション

```bash
# マイグレーション実行
sudo docker compose run --rm migrate

# 新しいマイグレーションファイル作成
sudo docker compose exec backend alembic revision --autogenerate -m "Description"

# マイグレーション履歴確認
sudo docker compose exec backend alembic history
```

### データベースアクセス

```bash
# MySQL接続
sudo docker compose exec mysql mysql -u mav_user -pmav_password mav_db

# テーブル確認
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM contents;
SELECT * FROM categories;
SELECT * FROM content_categories;
SELECT * FROM files;
```

## APIテスト例

### 初期セットアップ

```bash
# セットアップ状態確認
curl "http://localhost:8000/auth/setup-status"

# 初期管理者作成
curl -X POST "http://localhost:8000/auth/initial-setup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin", 
    "password": "your_secure_password"
  }'
```

### ログイン

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "your_email@example.com", "password": "your_password"}'
```

### コンテンツ作成（要認証）

```bash
TOKEN="your_jwt_token_here"
curl -X POST "http://localhost:8000/contents/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "新しい記事",
    "content": "記事の内容",
    "category_ids": [1, 2]
  }'
```

### 公開コンテンツ取得

```bash
# 全コンテンツ
curl "http://localhost:8000/contents/"

# カテゴリフィルタ
curl "http://localhost:8000/contents/?category=ニュース"
```

### ファイルアップロード（要認証）

```bash
TOKEN="your_jwt_token_here"

# ファイルアップロード
curl -X POST "http://localhost:8000/uploads/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/image.jpg"

# アップロードファイル一覧
curl -X GET "http://localhost:8000/uploads/" \
  -H "Authorization: Bearer $TOKEN"

# ファイル削除
curl -X DELETE "http://localhost:8000/uploads/filename.jpg" \
  -H "Authorization: Bearer $TOKEN"
```

## データベース構造

### 主要テーブル

- **users**: ユーザー情報（管理者・一般ユーザー）
- **contents**: コンテンツ（記事）
- **categories**: カテゴリ
- **content_categories**: コンテンツとカテゴリの多対多関係
- **files**: アップロードファイル情報（ファイル名、サイズ、アップロード者等）

### 多対多関係

コンテンツとカテゴリは中間テーブル`content_categories`で関連付けられており、1つのコンテンツに複数のカテゴリを割り当て可能です。

## トラブルシューティング

### ポートが使用中

```bash
# ポート確認
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# プロセス終了
sudo kill -9 <PID>
```

### Docker関連の問題

```bash
# Docker環境クリーンアップ
sudo docker system prune -f
sudo docker compose down -v
sudo docker compose up --build -d
```

### データベース接続エラー

```bash
# データベースコンテナの状態確認
sudo docker compose ps
sudo docker compose logs mysql

# マイグレーションの再実行
sudo docker compose run --rm migrate
```


## セキュリティ

- パスワードハッシュ化（bcrypt）
- JWT認証
- 管理者権限チェック
- 論理削除（データの物理削除を回避）
- CORS設定
- ファイル拡張子制限（画像ファイルのみ）
- ファイルサイズ制限（10MB）
- ディレクトリトラバーサル攻撃防止
- ユニークファイル名生成（UUID使用）

## 本番環境への展開

本番環境では以下の点に注意してください：

1. 環境変数の適切な設定（JWT_SECRET等）
2. HTTPSの使用
3. データベースのバックアップ設定
4. ログ監視の設定
5. リバースプロキシ（Nginx等）の設定