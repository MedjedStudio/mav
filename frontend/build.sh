#!/bin/bash

# フロントエンドビルドスクリプト
# 使用方法: ./build.sh

set -e

# .envファイルを読み込み
if [ -f .env ]; then
    source .env
fi

echo "フロントエンドをビルドしています..."
echo "VITE_API_URL: $VITE_API_URL"

# Dockerを使用してフロントエンドをビルド
docker run --rm \
  -v $(pwd):/app \
  -e VITE_API_URL="$VITE_API_URL" \
  -w /app \
  node:18-alpine sh -c "
    echo 'パッケージをインストールしています...'
    npm ci
    
    echo 'アプリケーションをビルドしています...'
    npm run build
    
    echo 'ビルド完了！'
  "

# ビルド結果の確認
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "[SUCCESS] フロントエンドのビルドが完了しました"
    echo "[INFO] 静的ファイルは frontend/dist ディレクトリに生成されました"
    echo "[INFO] ファイルサイズ:"
    du -sh dist/*
else
    echo "[ERROR] ビルドに失敗しました"
    exit 1
fi