# mav

FastAPI（Python）+ React（Vite）+ MySQLによるCMS。

## 構成概要

- **バックエンド**: FastAPI, SQLAlchemy, Alembic, JWT認証
- **フロントエンド**: React, Vite
- **データベース**: MySQL
- **運用**: Docker（開発用）/ systemd+Nginx（本番用）

## ディレクトリ構成

```
mav/
├── backend/           # FastAPIアプリ
│   ├── services/      # ビジネスロジック層
│   ├── presentation/  # API層（FastAPI）
│   ├── infrastructure/# データアクセス層
│   ├── utils/         # ユーティリティ
│   └── uploads/       # アップロードファイル
├── frontend/          # Reactアプリ
├── nginx/             # Nginx設定
├── systemd/           # systemdサービス
├── docker-compose.yml
└── README.md
```
---

## 開発環境セットアップ

### 1. 環境準備

```bash
# リポジトリをクローン
git clone <repository-url>
cd mav

# 開発環境用環境変数を設定
cp .env.example .env
```

### 2. サービス起動

```bash
# Docker Composeで全サービスを起動
docker compose up --build -d

# データベースマイグレーションを実行
docker compose run --rm migrate
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API仕様書**: http://localhost:8000/docs

### 4. 初期セットアップ

初回アクセス時、管理者アカウントのセットアップ画面が表示されます。 
画面の指示に従って管理者アカウントを作成してください。

### 5. 初期セットアップのテスト

初期セットアップ機能をテストする場合：

```bash
# 現在のコンテナを停止
docker compose down

# DBも削除する場合は -v オプションを付与
docker compose down -v

# 新しい環境で起動
docker compose up --build -d
docker compose run --rm migrate
```

その後 http://localhost:3000 にアクセスして初期セットアップを実行。

---

## 本番環境デプロイ

本番環境では、パフォーマンスを向上させるため、Docker ではなく直接システムにデプロイします。

### 1. システム準備

```bash
# システムパッケージの更新・インストール
sudo apt update
sudo apt install git mysql-server python3 python3-pip python3-venv nodejs npm nginx

# MySQL セキュリティ設定
sudo mysql_secure_installation
```

### 2. プロジェクト取得・データベース設定

```bash
# プロジェクトをクローン
git clone <repository-url> /var/source/mav
cd /var/source/mav

# MySQLにrootでログイン
sudo mysql
CREATE DATABASE mav_db;
CREATE USER 'mav_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON mav_db.* TO 'mav_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 環境変数設定

```bash
# プロジェクトルートで環境変数を設定
cp .env.example .env
vi .env
```

**本番環境用環境変数の変更項目：**
```bash
# セキュリティ設定
DEBUG=false

# JWT設定（秘密鍵生成: openssl rand -base64 32）
JWT_SECRET_KEY=secure-random-key-32-characters
JWT_EXPIRE_HOURS=24

# データベース設定
MYSQL_USER=mav_user
MYSQL_PASSWORD=your_secure_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=mav_db

# CORS設定（本番ドメインを設定）
CORS_ORIGINS=https://mav.your-domain.com

# フロントエンド設定
VITE_API_URL=https://mav.your-domain.com/api

# アップロード設定
UPLOAD_DIR=/var/source/mav/backend/uploads
```

### 4. フロントエンドビルド

```bash
# フロントエンド環境変数を設定
cd frontend
cp .env.example .env
vi .env
# VITE_API_URL を本番ドメインに変更: https://your-domain.com/api

# フロントエンドディレクトリでビルドスクリプトを実行
sudo ./build.sh
cd ..
```

### 5. バックエンド設定

```bash
# Python仮想環境を作成・有効化
python3 -m venv backend/venv
source backend/venv/bin/activate

# 依存関係をインストール
pip install -r backend/requirements.txt

# データベースマイグレーション実行
cd backend
alembic upgrade head
cd ..
```

### 6. Nginx設定

```bash
# mav用設定ファイルをコピー・編集
sudo cp nginx/mav.conf /etc/nginx/sites-available/mav
sudo vi /etc/nginx/sites-available/mav
# server_name を mav.your-actual-domain.com に変更
# root のパスを実際のプロジェクトパスに変更

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/mav /etc/nginx/sites-enabled/mav

# 設定をテスト・再読み込み
sudo nginx -t
sudo systemctl reload nginx
```

### 7. systemdサービス設定

```bash
# サービスファイルをコピーして環境に合わせて編集
sudo cp systemd/mav-backend.service /etc/systemd/system/
sudo vi /etc/systemd/system/mav-backend.service
# YOUR_USERNAME と /path/to/mav/backend を実際の値に変更

# サービスを有効化・起動
sudo systemctl daemon-reload
sudo systemctl enable mav-backend
sudo systemctl start mav-backend

# サービス状態確認
sudo systemctl status mav-backend
```

### 8. 動作確認

```bash
# バックエンドAPI確認
curl -f https://your-domain.com/api/auth/setup-status

# ログ確認
sudo journalctl -u mav-backend -f
```

### 9. 初期セットアップ

ブラウザで `https://your-domain.com` にアクセスし、管理者アカウントを作成してください。

---

## 開発コマンド

### Docker Compose操作

```bash
# サービス起動
docker compose up -d

# ログ確認
docker compose logs backend
docker compose logs frontend

# サービス再起動
docker compose restart backend

# 停止・削除
docker compose down

# 完全クリーンアップ（データベース含む）
docker compose down -v
```

### データベース操作

```bash
# マイグレーション実行
docker compose run --rm migrate

# 新しいマイグレーションファイル作成
docker compose exec backend alembic revision --autogenerate -m "Description"

# マイグレーション履歴確認
docker compose exec backend alembic history

# MySQL接続
docker compose exec mysql mysql -u mav_user -pmav_password mav_db
```

---

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
```

---

## データベース構造

### 主要テーブル

- **users**: ユーザー情報（管理者・一般ユーザー）
- **contents**: コンテンツ（記事）
- **categories**: カテゴリ
- **content_categories**: コンテンツとカテゴリの多対多関係
- **files**: アップロードファイル情報（ファイル名、サイズ、アップロード者等）

---

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
docker compose down -v
docker compose up --build -d
```

### データベース接続エラー

```bash
# データベースコンテナの状態確認
docker compose ps
docker compose logs mysql

# マイグレーションの再実行
docker compose run --rm migrate
```

### 本番環境サービス関連

```bash
# systemdサービスの再起動
sudo systemctl restart mav-backend

# ログ確認
sudo journalctl -u mav-backend -f

# Nginx再起動
sudo systemctl reload nginx
```

---

## 更新・メンテナンス

### アプリケーション更新

```bash
# 最新コードを取得
git pull

# フロントエンドの再ビルド
cd frontend
sudo ./build.sh
cd ..

# 依存関係の更新（必要に応じて）
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# バックエンドサービスの再起動
sudo systemctl restart mav-backend

# 動作確認
sudo systemctl status mav-backend
curl -f https://your-domain.com/api/auth/setup-status
```

### 環境変数の更新

HTTPS配信の問題解決時：

```bash
# プロジェクトルートの環境変数を確認・更新
vi .env

# 以下の設定が正しく設定されているか確認
# CORS_ORIGINS=https://your-domain.com
# VITE_API_URL=https://your-domain.com/api

# 設定変更後は再ビルドと再起動が必要
cd frontend
sudo ./build.sh
cd ..
sudo systemctl restart mav-backend
```