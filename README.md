# MAV Application

FastAPI + Reactを使用したフルスタックWebアプリケーションです。excel-apiプロジェクトの構成を参考に作成されています。

## アーキテクチャ

- **バックエンド**: FastAPI + Uvicorn
- **フロントエンド**: React + Vite
- **開発環境**: Docker + Docker Compose

## プロジェクト構成

```
mav/
├── backend/                # FastAPI アプリケーション
│   ├── app.py             # メインアプリケーション
│   ├── services/          # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── convert.py     # URL変換機能
│   │   └── status.py      # ヘルスチェック機能
│   ├── requirements.txt   # Python依存関係
│   ├── Dockerfile         # バックエンド用Docker設定
│   └── .env.example       # バックエンド環境変数テンプレート
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

### POST /convert
URL処理とファイル保存

**リクエスト:**
```json
{
  "url": "https://example.com"
}
```

**レスポンス:**
```json
{
  "message": "File saved successfully",
  "url": "https://example.com",
  "file_location": "/app/output/20250825_120000.txt"
}
```

### GET /status
ヘルスチェック

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-25T12:00:00.000000",
  "service": "mav-api"
}
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
# convert API テスト
curl -X POST "http://localhost:8000/convert" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# status API テスト
curl -X GET "http://localhost:8000/status"
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
4. **出力ファイル**: バックエンドの処理結果は `backend/output/` に保存

## 本番環境への展開

本番環境では、各サービスを個別にビルドし、適切なWebサーバー（Nginx等）でホストすることを推奨します。