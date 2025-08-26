"""簡単なバックアップ機能のテスト版"""

import os
import json
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, selectinload
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import ContentModel, CategoryModel, UserModel
from presentation.api.auth_router import require_admin

router = APIRouter(tags=["backup"])

def get_upload_directory() -> str:
    """アップロードディレクトリのパスを取得"""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

@router.get("/info")
def get_backup_info(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """バックアップ情報を取得"""
    try:
        # データベース統計
        user_count = db.query(UserModel).count()
        category_count = db.query(CategoryModel).count()
        content_count = db.query(ContentModel).count()
        
        # アップロードファイル統計
        upload_dir = Path(get_upload_directory())
        file_count = 0
        total_size = 0
        
        if upload_dir.exists():
            for file_path in upload_dir.rglob('*'):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    file_count += 1
                    total_size += file_path.stat().st_size
        
        return {
            "database": {
                "users": user_count,
                "categories": category_count,
                "contents": content_count
            },
            "files": {
                "count": file_count,
                "total_size": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")

@router.get("/download")
async def download_backup(
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """バックアップファイルをダウンロード"""
    try:
        # 一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp()
        backup_dir = Path(temp_dir) / "backup"
        backup_dir.mkdir()
        
        # データベースデータを取得
        users = db.query(UserModel).all()
        categories = db.query(CategoryModel).all()
        contents = db.query(ContentModel).options(selectinload(ContentModel.categories)).all()
        
        # 完全なデータベースデータを作成
        db_data = {
            "users": [{"id": u.id, "username": u.username, "email": u.email, "password_hash": u.password_hash, "role": u.role.value, "created_at": u.created_at.isoformat(), "updated_at": u.updated_at.isoformat()} for u in users],
            "categories": [{"id": c.id, "name": c.name, "description": c.description, "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat()} for c in categories],
            "contents": [{"id": c.id, "title": c.title, "content": c.content, "categories": [cat.name for cat in c.categories], "created_at": c.created_at.isoformat(), "updated_at": c.updated_at.isoformat()} for c in contents],
            "exported_at": datetime.now().isoformat()
        }
        
        # データベースデータをJSONファイルに保存
        db_file = backup_dir / "database.json"
        with open(db_file, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
        
        # アップロードファイルをコピー（隠しファイルは除外）
        upload_dir = Path(get_upload_directory())
        if upload_dir.exists():
            uploads_backup_dir = backup_dir / "uploads"
            uploads_backup_dir.mkdir()
            import shutil
            for item in upload_dir.rglob('*'):
                if item.is_file() and not item.name.startswith('.'):
                    relative_path = item.relative_to(upload_dir)
                    dest_path = uploads_backup_dir / relative_path
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dest_path)
        
        # ZIPファイルを作成
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"mav_backup_{timestamp}.zip"
        zip_path = Path(temp_dir) / zip_filename
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(backup_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(backup_dir)
                    zipf.write(file_path, arcname)
        
        return FileResponse(
            path=str(zip_path),
            filename=zip_filename,
            media_type='application/zip'
        )
    
    except Exception as e:
        import traceback
        print(f"バックアップエラー: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"バックアップの作成に失敗: {str(e)}")

@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """バックアップファイルから復元"""
    try:
        # アップロードされたファイルがZIPかチェック
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="ZIPファイルをアップロードしてください")
        
        # 一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp()
        zip_path = Path(temp_dir) / file.filename
        
        # ZIPファイルを保存
        with open(zip_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        # ZIPファイルを展開
        extract_dir = Path(temp_dir) / "extracted"
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(extract_dir)
        
        # データベースファイルを読み込み
        db_file = extract_dir / "database.json"
        if not db_file.exists():
            raise HTTPException(status_code=400, detail="バックアップファイルが不正です（database.jsonが見つかりません）")
        
        with open(db_file, 'r', encoding='utf-8') as f:
            db_data = json.load(f)
        
        # 既存のデータをクリア（外部キー制約を考慮した順序）
        # 1. 中間テーブルを先にクリア
        from infrastructure.persistence.models import content_categories, FileModel
        db.execute(content_categories.delete())
        
        # 2. 外部キー参照のあるテーブルを先にクリア
        db.query(FileModel).delete()  # filesテーブルはusersを参照
        db.query(ContentModel).delete()
        db.query(CategoryModel).delete() 
        db.query(UserModel).delete()
        db.commit()
        
        # ユーザーデータを復元
        from infrastructure.persistence.models import UserRole
        for user_data in db_data.get("users", []):
            user = UserModel(
                id=user_data["id"],
                username=user_data["username"],
                email=user_data["email"],
                password_hash=user_data["password_hash"],
                role=UserRole(user_data["role"]),
                created_at=datetime.fromisoformat(user_data["created_at"]),
                updated_at=datetime.fromisoformat(user_data["updated_at"])
            )
            db.add(user)
        
        # カテゴリデータを復元
        categories_map = {}
        for category_data in db_data.get("categories", []):
            category = CategoryModel(
                id=category_data["id"],
                name=category_data["name"],
                description=category_data["description"],
                created_at=datetime.fromisoformat(category_data["created_at"]),
                updated_at=datetime.fromisoformat(category_data["updated_at"])
            )
            db.add(category)
            categories_map[category_data["name"]] = category
        
        db.commit()  # カテゴリをコミットしてからコンテンツを作成
        
        # コンテンツデータを復元
        for content_data in db_data.get("contents", []):
            content = ContentModel(
                id=content_data["id"],
                title=content_data["title"],
                content=content_data["content"],
                created_at=datetime.fromisoformat(content_data["created_at"]),
                updated_at=datetime.fromisoformat(content_data["updated_at"])
            )
            
            # カテゴリを関連付け
            for cat_name in content_data.get("categories", []):
                if cat_name in categories_map:
                    content.categories.append(categories_map[cat_name])
            
            db.add(content)
        
        db.commit()
        
        # アップロードファイルを復元
        uploads_backup_dir = extract_dir / "uploads"
        upload_dir = Path(get_upload_directory())
        
        # 既存のアップロードファイルを削除（ディレクトリ内のファイルのみ）
        if upload_dir.exists():
            import shutil
            for item in upload_dir.iterdir():
                if item.is_file():
                    item.unlink()  # ファイルを削除
                elif item.is_dir():
                    shutil.rmtree(item)  # サブディレクトリを削除
        else:
            # アップロードディレクトリが存在しない場合は作成
            upload_dir.mkdir(parents=True, exist_ok=True)
        
        # バックアップからファイルをコピー
        if uploads_backup_dir.exists():
            import shutil
            for item in uploads_backup_dir.rglob('*'):
                if item.is_file():
                    relative_path = item.relative_to(uploads_backup_dir)
                    dest_path = upload_dir / relative_path
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dest_path)
        
        # .gitkeepファイルを確実に作成（Gitリポジトリ管理のため）
        gitkeep_file = upload_dir / ".gitkeep"
        if not gitkeep_file.exists():
            gitkeep_file.touch()
        
        return {"message": "バックアップから正常に復元されました"}
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"復元エラー: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"復元に失敗しました: {str(e)}")