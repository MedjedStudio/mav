
# mav - コンテンツ管理システム

FastAPI（Python）＋React（Vite）＋MySQLによる、管理・公開・バックアップ・権限管理が揃ったCMSです。

## 構成概要

- **バックエンド**: FastAPI, SQLAlchemy, Alembic, JWT認証
- **フロントエンド**: React, Vite
- **データベース**: MySQL
- **運用**: Docker（開発用）/ systemd+Nginx（本番用）

## ディレクトリ構成（抜粋）

```
mav/
├── backend/      # FastAPIアプリ
├── frontend/     # Reactアプリ
├── nginx/        # Nginx設定
├── systemd/      # systemdサービス
├── docker-compose.yml
└── README.md
```

---

## クイックスタート（開発環境/Docker）

1. リポジトリ取得・環境変数設定
  ```bash
  git clone <repository-url>
  cd mav
  cp .env.example .env
  ```
2. サービス起動
  ```bash
  docker compose up --build -d
  docker compose run --rm migrate
  ```
3. アクセス
  - フロント: http://localhost:3000
  - バックエンドAPI: http://localhost:8000
  - APIドキュメント: http://localhost:8000/docs

---

## 本番運用（Native Deployment）

1. サーバー準備（Ubuntu推奨）
  ```bash
  sudo apt update
  sudo apt install git mysql-server python3 python3-pip python3-venv nodejs npm nginx
  ```
2. プロジェクト取得・DB設定
  ```bash
  git clone <repository-url> /var/source/mav
  sudo mysql
  CREATE DATABASE mav_db;
  CREATE USER 'mav_user'@'localhost' IDENTIFIED BY 'secure_password';
  GRANT ALL PRIVILEGES ON mav_db.* TO 'mav_user'@'localhost';
  FLUSH PRIVILEGES;
  EXIT;
  ```
3. .env編集（JWT/CORS/DB/パス等を本番用に）
4. バックエンド: venv作成→依存インストール→alembic upgrade
5. フロントエンド: build.sh実行
6. Nginx設定: nginx/mav.confをsites-availableへコピー・編集
7. systemdサービス: systemd/mav-backend.serviceを編集・登録
8. サービス起動・動作確認

---

## 主要機能

- 記事・カテゴリ・ファイル・ユーザー管理
- プロフィール・権限管理
- バックアップ・復元
- 初期セットアップ（管理者アカウント作成）

---

## APIエンドポイント例

### 認証・ユーザー
- `POST /auth/login` ログイン
- `GET /auth/me` ユーザー情報取得
- `PUT /auth/profile` プロフィール更新
- `PUT /auth/password` パスワード変更

### コンテンツ
- `GET /contents/` 公開コンテンツ一覧
- `GET /contents/{id}` 個別コンテンツ取得
- `POST /contents/` 作成（管理者）
- `PUT /contents/{id}` 更新（管理者）
- `DELETE /contents/{id}` 削除（管理者）

### カテゴリ
- `GET /categories/` 一覧
- `POST /categories/` 作成（管理者）
- `PUT /categories/{id}` 更新（管理者）
- `DELETE /categories/{id}` 削除（管理者）

### ファイル
- `POST /uploads/upload` アップロード（管理者）
- `GET /uploads/` 一覧（管理者）
- `DELETE /uploads/{filename}` 削除（管理者）

### バックアップ
- `GET /backup/info` 情報取得
- `GET /backup/download` ダウンロード
- `POST /backup/restore` 復元

---

## よく使う開発コマンド

```bash
# サービス起動/停止
docker compose up -d
docker compose down
# マイグレーション
docker compose run --rm migrate
# ログ確認
docker compose logs backend
docker compose logs frontend
# DBアクセス
docker compose exec mysql mysql -u mav_user -pmav_password mav_db
```

---

## トラブルシューティング

### ポート競合
```bash
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000
sudo kill -9 <PID>
```

### Docker不調
```bash
sudo docker system prune -f
docker compose down -v
docker compose up --build -d
```

### 本番サービス再起動
```bash
sudo systemctl restart mav-backend
sudo systemctl reload nginx
sudo journalctl -u mav-backend -f
```

---

## 更新・メンテナンス

```bash
# コード更新
git pull
# 依存更新
cd backend && source venv/bin/activate && pip install -r requirements.txt && cd ..
# フロント再ビルド
cd frontend && sudo ./build.sh && cd ..
# サービス再起動
sudo systemctl restart mav-backend
```

## クイックスタート（開発環境）

### 1. 環境設定

開発環境では Docker Compose を使用します：

```bash
# リポジトリをクローン
git clone <repository-url>
cd mav

# 開発環境用環境変数を設定
cp .env.example .env

# Docker Composeで全サービスを起動
docker compose up --build -d

# データベースマイグレーションを実行
docker compose run --rm migrate
```

### 2. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API仕様書**: http://localhost:8000/docs

### 3. 初期セットアップ

初回アクセス時、管理者アカウントのセットアップ画面が表示されます。
画面の指示に従って管理者アカウントを作成してください。

セットアップ完了後、自動的に管理画面にログインされます。

## 初期セットアップのテスト方法

初期セットアップ機能をテストする場合は、以下の手順で行ってください：

### 1. データベースをクリアして初期状態にする

```bash
# 現在のコンテナを停止・削除（データベースも削除）
docker compose down -v

# 新しい環境で起動
docker compose up --build -d

# データベースマイグレーションを実行
docker compose run --rm migrate
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

### バックアップ・復元（管理者のみ）

- `GET /backup/info` - バックアップ情報取得
- `GET /backup/download` - バックアップファイルダウンロード
- `POST /backup/restore` - バックアップファイルから復元

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

### データベースマイグレーション

```bash
# マイグレーション実行
docker compose run --rm migrate

# 新しいマイグレーションファイル作成
docker compose exec backend alembic revision --autogenerate -m "Description"

# マイグレーション履歴確認
docker compose exec backend alembic history
```

### データベースアクセス

```bash
# MySQL接続
docker compose exec mysql mysql -u mav_user -pmav_password mav_db

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

**開発環境：**
```bash
# Docker環境クリーンアップ
sudo docker system prune -f
docker compose down -v
docker compose up --build -d
```

**本番環境（Native Deployment）：**
```bash
# systemdサービスの再起動
sudo systemctl restart mav-backend

# ログ確認
sudo journalctl -u mav-backend -f

# 必要に応じてNginx再起動
sudo systemctl reload nginx
```

### データベース接続エラー

```bash
# データベースコンテナの状態確認
docker compose ps
docker compose logs mysql

# マイグレーションの再実行
docker compose run --rm migrate
```



## 本番環境デプロイ（Native Deployment）

**注意:** 本番環境では、パフォーマンスとセキュリティを向上させるため、Docker ではなく直接システムにデプロイします。

### 本番用ファイル構成

```
mav/
├── nginx/
│   └── mav.conf                 # Nginxリバースプロキシ設定
├── systemd/
│   └── mav-backend.service      # systemdサービス設定
└── frontend/
    └── build.sh                 # フロントエンドビルドスクリプト
```

### デプロイ手順

#### 1. システム準備

```bash
# システムパッケージの更新
sudo apt update

# 必要なパッケージをインストール
sudo apt install git mysql-server python3 python3-pip python3-venv nodejs npm nginx

# MySQL セキュリティ設定
sudo mysql_secure_installation
```

#### 2. プロジェクトの取得

```bash
# プロジェクトをクローン
git clone <repository-url> /var/source/mav
cd /var/source/mav
```

#### 3. データベースの設定

```bash
# MySQLにrootでログイン
sudo mysql

# データベースとユーザーを作成
CREATE DATABASE mav_db;
CREATE USER 'mav_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON mav_db.* TO 'mav_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 4. 環境変数の設定

**環境変数設定：**
```bash
# プロジェクトルートで環境変数を設定
cp .env.example .env

# 環境変数を本番用に編集
vi .env
```

**本番環境用環境変数の変更項目：**
```bash
# セキュリティ設定
DEBUG=false

# JWT設定
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

**重要:** 本番環境では、バックエンドアプリケーション、データベースマイグレーション、フロントエンドビルドすべてが **プロジェクトルート（mav/）の .env ファイル** を参照するように統一されています。

**JWT秘密鍵の生成：**
```bash
# 秘密鍵を生成
openssl rand -base64 32
```

#### 5. バックエンドの設定

```bash
# Python仮想環境を作成
python3 -m venv backend/venv

# 仮想環境をアクティベート
source backend/venv/bin/activate

# 依存関係をインストール
pip install -r backend/requirements.txt

# データベースマイグレーション実行
cd backend
alembic upgrade head
cd ..
```

#### 6. フロントエンドのビルド

```bash
# フロントエンドディレクトリでビルドスクリプトを実行
cd frontend
sudo ./build.sh
cd ..
```

#### 7. Nginxへの設定追加

```bash
# mav用設定ファイルをコピー
sudo cp nginx/mav.conf /etc/nginx/sites-available/mav

# 設定を編集
sudo vi /etc/nginx/sites-available/mav
# server_name を mav.your-actual-domain.com に変更
# root のパスを実際のプロジェクトパスに変更
# 例: root /home/user/mav/frontend/dist;

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/mav /etc/nginx/sites-enabled/mav

# 設定をテスト
sudo nginx -t

# Nginxを再読み込み
sudo systemctl reload nginx
```

#### 7. バックエンドサービスの起動

```bash
# バックエンドディレクトリに移動して仮想環境を有効化
cd backend
source venv/bin/activate

# Gunicornでバックエンドを起動（手動起動の場合）
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --access-logfile logs/access.log --error-logfile logs/error.log

# 手動でバックグラウンド実行する場合（systemdを使わない場合のみ）
nohup gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000 --access-logfile logs/access.log --error-logfile logs/error.log > logs/mav_backend.log 2>&1 &
```

#### 8. systemdサービスの設定（推奨）

systemdを使用することで、自動起動・自動復旧・ログ管理が簡単になります。

```bash
# サービスファイルをコピーして環境に合わせて編集
sudo cp systemd/mav-backend.service /etc/systemd/system/
sudo vi /etc/systemd/system/mav-backend.service

# 以下のプレースホルダーを実際の値に変更:
# - YOUR_USERNAME -> 実際のユーザー名（例：ubuntu）
# - /path/to/mav/backend -> 実際のプロジェクトパス（例：/var/source/mav/backend）

# サービスを有効化・起動
sudo systemctl daemon-reload
sudo systemctl enable mav-backend
sudo systemctl start mav-backend

# サービス状態確認
sudo systemctl status mav-backend
```

**systemdサービスの管理コマンド：**
```bash
# ログ確認（リアルタイム）
sudo journalctl -u mav-backend -f

# サービスの停止・再起動
sudo systemctl stop mav-backend
sudo systemctl restart mav-backend

# サービスの無効化（自動起動を停止）
sudo systemctl disable mav-backend

# サービス設定の再読み込み（設定変更後）
sudo systemctl daemon-reload
sudo systemctl restart mav-backend
```

#### 9. 動作確認

```bash
# バックエンドAPI確認
curl -f https://mav.your-domain.com/api/auth/setup-status

# サービス状態確認
sudo systemctl status mav-backend

# ログ確認
sudo journalctl -u mav-backend -f
```

#### 10. 初期セットアップ

ブラウザで `https://mav.your-domain.com` にアクセスし、管理者アカウントを作成してください。

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

# 依存関係の更新（必要に応じて）
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# フロントエンドの再ビルド
cd frontend
sudo ./build.sh
cd ..

# バックエンドサービスの再起動
sudo systemctl restart mav-backend

# 動作確認
sudo systemctl status mav-backend
curl -f https://your-domain.com/api/auth/setup-status
```

#### 環境変数の更新

**HTTPS配信の問題解決：**
Mixed Content エラーが発生する場合は、以下を確認・更新してください：

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



### パフォーマンス最適化

**推奨スペック：**
- **最小**: 1vCPU, 1GB RAM, 20GB SSD
- **推奨**: 2vCPU, 2GB RAM, 40GB SSD
- **高負荷**: 4vCPU, 4GB RAM, 100GB SSD

**Gunicornワーカー数調整：**
```bash
# systemd/mav-backend.service でワーカー数を調整
# CPUコア数 x 2 + 1 が目安（デフォルト: 4）
ExecStart=...gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker...

# サービス再起動
sudo systemctl daemon-reload
sudo systemctl restart mav-backend
```