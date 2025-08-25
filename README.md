# MAV Application

FastAPI + Reactを使用したフルスタックWebアプリケーションです。

## アーキテクチャ

- **アーキテクチャパターン**: Domain Driven Design (DDD)
- **バックエンド**: FastAPI + Uvicorn
- **データベース**: MySQL 8.0
- **ORM**: SQLAlchemy
- **フロントエンド**: React + Vite
- **開発環境**: Docker + Docker Compose

## プロジェクト構成

```
mav/
├── backend/                        # FastAPI アプリケーション (DDD構造)
│   ├── app.py                     # FastAPIメインアプリ
│   ├── database.py                # データベース設定（後方互換性）
│   ├── models.py                  # 旧モデル（Alembic互換性）
│   ├── domain/                    # ドメイン層
│   │   ├── entities/             # エンティティ
│   │   │   └── user.py
│   │   ├── value_objects/        # 値オブジェクト
│   │   │   ├── email.py
│   │   │   └── username.py
│   │   └── repositories/         # リポジトリインターフェース
│   │       └── user_repository.py
│   ├── application/              # アプリケーション層
│   │   ├── dto/                  # データ転送オブジェクト
│   │   │   └── user_dto.py
│   │   ├── use_cases/           # ユースケース
│   │   │   └── user_use_cases.py
│   │   └── services/            # アプリケーションサービス
│   │       └── user_service.py
│   ├── infrastructure/          # インフラストラクチャ層
│   │   ├── persistence/         # データベース関連
│   │   │   ├── database.py      # DB接続設定
│   │   │   └── models.py        # SQLAlchemyモデル
│   │   └── repositories/        # リポジトリ実装
│   │       └── user_repository.py
│   ├── presentation/            # プレゼンテーション層
│   │   ├── api/                 # APIルーター
│   │   │   └── user_router.py
│   │   └── schemas/             # リクエスト/レスポンススキーマ
│   │       └── user_schemas.py
│   ├── alembic/                 # データベースマイグレーション
│   ├── requirements.txt         # Python依存関係
│   ├── Dockerfile              # バックエンド用Docker設定
│   └── .env.example            # バックエンド環境変数テンプレート
├── frontend/              # React アプリケーション
│   ├── src/
│   │   ├── App.jsx        # メインコンポーネント
│   │   ├── App.css        # スタイル
│   │   └── main.jsx       # エントリーポイント
│   ├── package.json       # Node.js依存関係
│   ├── vite.config.js     # Vite設定
│   ├── Dockerfile         # フロントエンド用Docker設定
│   └── index.html         # HTMLテンプレート
├── docker-compose.yml     # 開発環境用Docker構成
├── .env.example           # プロジェクト全体環境変数
├── .gitignore             # Git除外設定
└── README.md              # プロジェクト説明
```

## API仕様



### POST /users
ユーザー作成

**リクエスト:**
```json
{
  "username": "test_user",
  "email": "test@example.com"
}
```

**レスポンス:**
```json
{
  "id": 1,
  "username": "test_user",
  "email": "test@example.com",
  "created_at": "2025-08-25T12:00:00.000000"
}
```

### GET /users
ユーザー一覧取得

**パラメータ:**
- `skip`: スキップする件数（デフォルト: 0）
- `limit`: 取得件数（デフォルト: 100）

**レスポンス:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "created_at": "2025-08-25T12:00:00.000000"
  }
]
```

## ローカル開発環境

### 1. 環境構築

```bash
# リポジトリをクローン
cd /home/suisui/WebProjects/mav

# 環境変数の設定
cp .env.example .env

# フロントエンドの依存関係をインストール（package-lock.json生成）
cd frontend
npm install
cd ..
```

### 2. Docker Composeで起動

```bash
# 全体を起動（初回はビルドも実行）
sudo docker compose up --build

# バックグラウンドで起動
sudo docker compose up -d --build
```

### 3. アクセス

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API仕様書**: http://localhost:8000/docs

### 4. 開発時の操作

```bash
# ログ確認
sudo docker compose logs

# 特定のサービスのログ確認
sudo docker compose logs backend
sudo docker compose logs frontend

# サービス再起動
sudo docker compose restart backend
sudo docker compose restart frontend

# コード修正後の再起動（リビルド）
sudo docker compose down && sudo docker compose up --build

# 停止
sudo docker compose down

# 完全クリーンアップ（ボリューム含む）
sudo docker compose down -v
```

### 5. 個別サービスの開発

#### バックエンドのみ開発

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

#### フロントエンドのみ開発

```bash
cd frontend
npm install
npm run dev
```

## テスト

### API テスト（バックエンド）

```bash
# ユーザー作成
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{"username": "new_user", "email": "new@example.com"}'

# ユーザー一覧取得
curl -X GET "http://localhost:8000/users"
```

### MySQLデータベースアクセス

**開発者用MySQLログインコマンド:**
```bash
sudo docker compose exec mysql mysql -u mav_user -pmav_password mav_db
```

```bash
# データベース確認
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM contents;
SELECT * FROM alembic_version;
```

## データベースマイグレーション

### マイグレーションの実行

プロジェクトでは**Alembic**を使用してデータベーススキーマの変更を管理しています。

```bash
# 初回起動時（自動実行）
# docker-compose up --build実行時に自動でマイグレーションが実行されます

# 手動でマイグレーション実行
sudo docker compose run --rm migrate

# バックエンドコンテナ内でマイグレーション実行
sudo docker compose exec backend alembic upgrade head
```

### 新しいマイグレーションファイルの作成

```bash
# バックエンドコンテナに接続
sudo docker compose exec backend bash

# モデルの変更を自動検出してマイグレーションファイル作成
alembic revision --autogenerate -m "Add new column"

# 手動でマイグレーションファイル作成
alembic revision -m "Manual migration"

# マイグレーション実行
alembic upgrade head

# マイグレーション履歴確認
alembic history --verbose

# 現在のマイグレーション状態確認
alembic current
```

### マイグレーションのロールバック

```bash
# 1つ前のバージョンに戻す
alembic downgrade -1

# 特定のリビジョンに戻す
alembic downgrade 001

# 全てのマイグレーションを取り消し
alembic downgrade base
```

## トラブルシューティング

### ポートが使用中の場合

```bash
# ポート使用状況確認
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# プロセス終了
sudo kill -9 <PID>
```

### Docker関連の問題

```bash
# Docker環境をクリーンアップ
sudo docker system prune -f
sudo docker compose down -v

# package-lock.jsonが無い場合
cd frontend
npm install
cd ..

# 再ビルド
sudo docker compose up --build
```

## 開発のポイント

1. **CORS設定**: バックエンドでフロントエンドからのリクエストを許可済み
2. **ホットリロード**: 両方のサービスでコード変更時の自動リロード対応済み
3. **ボリュームマウント**: ソースコード変更がコンテナに即座に反映
4. **データベース**: MySQL 8.0でデータを永続化、ヘルスチェック機能付き
5. **ORM**: SQLAlchemyでデータベース操作を抽象化
6. **マイグレーション管理**: Alembicによるスキーマ変更の履歴管理
7. **自動マイグレーション**: Docker Compose起動時にマイグレーションを自動実行
8. **初期データ**: マイグレーションファイルで管理者ユーザーを自動作成
9. **ロールバック対応**: データベーススキーマの巻き戻し機能
10. **論理削除**: deleted_atカラムによる論理削除機能
11. **JWT認証**: パスワードハッシュ化とトークンベース認証
12. **メール認証**: ユーザー名ではなくメールアドレスでログイン

## 本番環境への展開

本番環境では、各サービスを個別にビルドし、適切なWebサーバー（Nginx等）でホストすることを推奨します。