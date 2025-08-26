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
│   ├── config.py                  # アプリケーション設定
│   ├── migrate.sh                 # データベースマイグレーションスクリプト
│   ├── application/               # アプリケーション層
│   │   ├── dto/                   # データ転送オブジェクト
│   │   ├── services/              # アプリケーションサービス
│   │   └── use_cases/             # ユースケース
│   ├── domain/                    # ドメイン層
│   │   ├── entities/              # エンティティ
│   │   ├── repositories/          # リポジトリインターフェース
│   │   └── value_objects/         # 値オブジェクト
│   ├── infrastructure/            # インフラストラクチャ層
│   │   ├── auth.py                # 認証インフラ
│   │   ├── persistence/           # データベース関連
│   │   │   ├── database.py        # DB接続設定
│   │   │   └── models.py          # SQLAlchemyモデル
│   │   └── repositories/          # リポジトリ実装
│   ├── presentation/              # プレゼンテーション層
│   │   ├── api/                   # APIルーター
│   │   │   ├── auth_router.py     # 認証API
│   │   │   ├── backup_router.py   # バックアップAPI
│   │   │   ├── category_router.py # カテゴリAPI
│   │   │   ├── content_router.py  # コンテンツAPI
│   │   │   ├── upload_router.py   # ファイルアップロードAPI
│   │   │   └── user_router.py     # ユーザーAPI
│   │   └── schemas/               # リクエスト/レスポンススキーマ
│   │       ├── auth_schemas.py    # 認証スキーマ
│   │       ├── category_schemas.py# カテゴリスキーマ
│   │       ├── content_schemas.py # コンテンツスキーマ
│   │       └── user_schemas.py    # ユーザースキーマ
│   ├── utils/                     # ユーティリティ
│   │   ├── auth_utils.py          # 認証ユーティリティ
│   │   ├── file_utils.py          # ファイルユーティリティ
│   │   └── response_utils.py      # レスポンスユーティリティ
│   ├── alembic/                   # データベースマイグレーション
│   ├── requirements.txt           # Python依存関係
│   ├── Dockerfile.dev             # 開発環境用Docker設定
│   └── Dockerfile.prod            # 本番環境用Docker設定
├── frontend/                      # React アプリケーション
│   ├── src/
│   │   ├── App.jsx               # メインコンポーネント
│   │   ├── App.css               # スタイル
│   │   ├── main.jsx              # エントリーポイント
│   │   ├── components/           # Reactコンポーネント
│   │   │   ├── admin/            # 管理画面コンポーネント
│   │   │   ├── forms/            # フォームコンポーネント
│   │   │   └── ui/               # UIコンポーネント
│   │   ├── services/             # APIサービス
│   │   │   ├── api.js            # API通信
│   │   │   └── auth.js           # 認証サービス
│   │   └── utils/                # ユーティリティ
│   ├── package.json              # Node.js依存関係
│   ├── vite.config.js            # Vite設定
│   ├── Dockerfile.dev            # 開発環境用Docker設定
│   └── index.html                # HTMLテンプレート
├── nginx/                         # Nginx設定
│   └── mav.conf                  # 本番環境用Nginx設定
├── uploads/                       # アップロードファイル保存先
├── build-frontend.sh              # フロントエンドビルドスクリプト
├── docker-compose.yml             # 開発環境用Docker構成
├── docker-compose.prod.yml        # 本番環境用Docker構成
└── README.md                      # プロジェクト説明
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

### 本番用ファイル構成

プロジェクトには以下の本番用設定ファイルが含まれています：

```
mav/
├── docker-compose.prod.yml      # 本番用Docker構成
├── backend/
│   └── Dockerfile.prod          # 本番用Dockerファイル（Gunicorn使用）
├── nginx/
│   └── mav.conf                 # Nginxリバースプロキシ設定
└── build-frontend.sh            # フロントエンドビルドスクリプト
```

### デプロイ手順

#### 1. フロントエンドのビルド

静的ファイルをビルドします：

```bash
# フロントエンドビルドスクリプトを実行
./build-frontend.sh
```

#### 2. Nginxへの設定追加

MAV用のNginx設定を追加します：

```bash
# MAV用設定ファイルをコピー
sudo cp nginx/mav.conf /etc/nginx/sites-available/mav

# 設定を編集
sudo vi /etc/nginx/sites-available/mav
# server_name を mav.your-actual-domain.com に変更
# root のパスを実際のプロジェクトパスに変更
# 例: root /home/user/mav/dist;

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/mav /etc/nginx/sites-enabled/mav

# 設定をテスト
sudo nginx -t

# Nginxを再読み込み
sudo systemctl reload nginx
```

#### 3. 環境変数の設定

```bash
# 環境変数テンプレートをコピー
cp .env.example .env

# 環境変数を本番用に編集
vi .env
```

**本番環境用に変更する項目：**
```bash
# セキュリティ設定
DEBUG=false
JWT_SECRET_KEY=secure-random-key-32-characters

# データベースパスワード（強力なものに変更）
MYSQL_ROOT_PASSWORD=secure-root-password
MYSQL_PASSWORD=secure-user-password

# ドメイン設定
VITE_API_URL=http://mav.your-domain.com/api
```

**JWT秘密鍵の生成：**
```bash
# 秘密鍵を生成
openssl rand -base64 32
```

#### 4. 本番環境でのデプロイ

```bash
# 本番用Docker構成で起動
sudo docker compose -f docker-compose.prod.yml up --build -d

# データベースマイグレーション実行
sudo docker compose -f docker-compose.prod.yml run --rm migrate

# 起動確認
sudo docker compose -f docker-compose.prod.yml ps
```

#### 5. 動作確認

```bash
# サービス状態確認
sudo docker compose -f docker-compose.prod.yml ps

# ログ確認
sudo docker compose -f docker-compose.prod.yml logs backend

# ヘルスチェック
curl -f http://mav.your-domain.com/api/auth/setup-status
```

#### 6. 初期セットアップ

ブラウザで `http://mav.your-domain.com` にアクセスし、管理者アカウントを作成してください。

### 本番環境の特徴

**セキュリティ向上：**
- MySQL外部ポート非公開
- Nginxリバースプロキシによる保護
- セキュリティヘッダー自動付与

**パフォーマンス向上：**
- Gunicorn + Uvicorn workers（4プロセス）
- Gzip圧縮
- 静的ファイルキャッシュ
- 適切なログ設定

**運用性向上：**
- 自動再起動（restart: unless-stopped）
- ヘルスチェック機能
- 構造化ログ出力

### 更新・メンテナンス

#### アプリケーション更新

```bash
# 最新コードを取得
git pull

# サービス更新（ダウンタイムあり）
sudo docker compose -f docker-compose.prod.yml down
sudo docker compose -f docker-compose.prod.yml up --build -d

# またはローリングアップデート
sudo docker compose -f docker-compose.prod.yml up --build -d --no-deps backend
sudo docker compose -f docker-compose.prod.yml up --build -d --no-deps frontend
```



### パフォーマンス最適化

**推奨スペック：**
- **最小**: 1vCPU, 1GB RAM, 20GB SSD
- **推奨**: 2vCPU, 2GB RAM, 40GB SSD
- **高負荷**: 4vCPU, 4GB RAM, 100GB SSD

**Gunicornワーカー数調整：**
```bash
# backend/Dockerfile.prod でワーカー数を調整
# CPUコア数 x 2 + 1 が目安
CMD ["gunicorn", "app:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", ...]
```