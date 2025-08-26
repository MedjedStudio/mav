#!/bin/bash

# フロントエンドビルドスクリプト
# 使用方法: ./build-frontend.sh

set -e

echo "フロントエンドをビルドしています..."

# Dockerを使用してフロントエンドをビルド
docker run --rm \
  -v $(pwd)/frontend:/app \
  -v $(pwd)/dist:/app/dist \
  -w /app \
  node:18-alpine sh -c "
    echo 'パッケージをインストールしています...'
    npm ci --only=production
    
    echo 'アプリケーションをビルドしています...'
    npm run build
    
    echo 'ビルド完了！'
  "

# ビルド結果の確認
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "✅ フロントエンドのビルドが完了しました"
    echo "📁 静的ファイルは ./dist ディレクトリに生成されました"
    echo "📊 ファイルサイズ:"
    du -sh dist/*
else
    echo "❌ ビルドに失敗しました"
    exit 1
fi